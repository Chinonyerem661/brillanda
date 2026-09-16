import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { TENANT_MODELS, TenantViolationError, withTenant } from "../src/middleware/tenantScope";
import { createSchool, createUser, uniqueId } from "./helpers";

// BRD R-4 / Build Guide §3 — release blocker. A client scoped to school A must never read or change
// school B's rows, even when handed a valid id from school B.

async function seedSchool() {
  const school = await createSchool();
  const admin = await createUser(school.id, "SCHOOL_ADMIN");
  const student = await prisma.student.create({
    data: { schoolId: school.id, admissionNo: `ADM-${uniqueId()}`, fullName: "Original Name" },
  });
  const subject = await prisma.subject.create({ data: { schoolId: school.id, name: `Subject ${uniqueId()}` } });
  return { school, admin, student, subject };
}

type SeededSchool = Awaited<ReturnType<typeof seedSchool>>;

const rejectsAsNotFound = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: "P2025" });
const rejectsAsViolation = (promise: Promise<unknown>) => expect(promise).rejects.toBeInstanceOf(TenantViolationError);

describe("withTenant", () => {
  let a: SeededSchool;
  let b: SeededSchool;
  let db: ReturnType<typeof withTenant>;

  beforeAll(async () => {
    [a, b] = await Promise.all([seedSchool(), seedSchool()]);
    db = withTenant(a.school.id);
  });

  it("covers every model that has a schoolId column", () => {
    // Update this list deliberately when adding a school-owned model.
    expect([...TENANT_MODELS].sort()).toEqual(
      [
        "AcademicSession", "Arm", "AssessmentComponent", "AuditLog", "Class", "ClassSubject", "Enrollment",
        "GradingScaleEntry", "Notification", "ParentAccessCode", "ParentStudent", "PublishStatus", "Result",
        "Score", "Student", "Subject", "SubjectEntryStatus", "TeacherAssignment", "Term", "TermSummary",
        "UnlockRequest", "User",
      ].sort(),
    );
  });

  describe("reads", () => {
    it("lists only the school's own rows", async () => {
      expect((await db.student.findMany()).map((s) => s.id)).toEqual([a.student.id]);
    });

    it("treats another school's id as not found", async () => {
      expect(await db.student.findUnique({ where: { id: b.student.id } })).toBeNull();
      expect(await db.student.findFirst({ where: { id: b.student.id } })).toBeNull();
      await rejectsAsNotFound(db.student.findUniqueOrThrow({ where: { id: b.student.id } }));
    });

    it("ignores a filter that names another school", async () => {
      expect(await db.student.findMany({ where: { schoolId: b.school.id } })).toEqual([]);
    });

    it("scopes count and groupBy", async () => {
      expect(await db.student.count()).toBe(1);
      expect(await db.student.groupBy({ by: ["schoolId"], _count: true })).toEqual([
        { schoolId: a.school.id, _count: 1 },
      ]);
    });

    it("hides other schools' users and super admins", async () => {
      await createUser(null, "SUPER_ADMIN");
      expect((await db.user.findMany()).map((u) => u.id)).toEqual([a.admin.id]);
    });

    it("exposes only the caller's own school record", async () => {
      expect(await db.school.findUnique({ where: { id: b.school.id } })).toBeNull();
      expect((await db.school.findMany()).map((s) => s.id)).toEqual([a.school.id]);
    });

    it("stays scoped inside an interactive transaction", async () => {
      const ids = await db.$transaction(async (tx) => (await tx.student.findMany()).map((s) => s.id));
      expect(ids).toEqual([a.student.id]);
    });
  });

  describe("writes", () => {
    it("cannot update another school's row by id", async () => {
      await rejectsAsNotFound(db.student.update({ where: { id: b.student.id }, data: { fullName: "Hijacked" } }));
      expect((await db.student.updateMany({ where: { id: b.student.id }, data: { fullName: "Hijacked" } })).count).toBe(0);
      expect((await prisma.student.findUniqueOrThrow({ where: { id: b.student.id } })).fullName).toBe("Original Name");
    });

    it("cannot delete another school's row by id", async () => {
      await rejectsAsNotFound(db.subject.delete({ where: { id: b.subject.id } }));
      expect((await db.subject.deleteMany({ where: { id: b.subject.id } })).count).toBe(0);
      expect(await prisma.subject.findUnique({ where: { id: b.subject.id } })).not.toBeNull();
    });

    it("cannot update another school's record", async () => {
      await rejectsAsNotFound(db.school.update({ where: { id: b.school.id }, data: { name: "Hijacked" } }));
    });

    it("refuses to create rows for another school", async () => {
      const marker = `Sneaky ${uniqueId()}`;
      await rejectsAsViolation(db.subject.create({ data: { schoolId: b.school.id, name: marker } }));
      await rejectsAsViolation(
        db.subject.createMany({
          data: [
            { schoolId: a.school.id, name: `${marker} ok` },
            { schoolId: b.school.id, name: marker },
          ],
        }),
      );
      expect(await prisma.subject.count({ where: { name: { startsWith: marker } } })).toBe(0);
    });

    it("refuses to move rows to another school", async () => {
      await rejectsAsViolation(db.student.update({ where: { id: a.student.id }, data: { schoolId: b.school.id } }));
      await rejectsAsViolation(db.student.updateMany({ data: { schoolId: b.school.id } }));
    });

    it("refuses to create or delete schools", async () => {
      await rejectsAsViolation(db.school.create({ data: { name: "New", slug: `new-${uniqueId()}` } }));
      await rejectsAsViolation(db.school.delete({ where: { id: b.school.id } }));
    });

    it("upserts into its own school only", async () => {
      await rejectsAsViolation(
        db.subject.upsert({ where: { id: b.subject.id }, create: { schoolId: b.school.id, name: "x" }, update: {} }),
      );
      const created = await db.subject.upsert({
        where: { id: b.subject.id },
        create: { schoolId: a.school.id, name: `Upserted ${uniqueId()}` },
        update: { name: "Hijacked" },
      });
      expect(created.schoolId).toBe(a.school.id);
      expect(created.id).not.toBe(b.subject.id);
      expect((await prisma.subject.findUniqueOrThrow({ where: { id: b.subject.id } })).name).not.toBe("Hijacked");
    });
  });
});
