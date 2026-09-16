// Demo data so every Phase 1-2 flow can be exercised right after setup (Build Guide §12).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SCHOOL_SETTINGS } from "@brillanda/shared-types";
import {
  DEFAULT_ASSESSMENT_COMPONENTS,
  DEFAULT_GRADING_SCALE,
  DEFAULT_SUBJECTS,
  DEFAULT_TERM_NAMES,
} from "../src/lib/defaults";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const DEMO_SLUG = "demo-academy";

const STUDENTS = [
  { admissionNo: "BDA/2026/001", fullName: "Chiamaka Obi", gender: "Female", dob: "2014-03-12", guardianName: "Ifeoma Obi", guardianPhone: "+234 803 000 0001" },
  { admissionNo: "BDA/2026/002", fullName: "Emeka Nwosu", gender: "Male", dob: "2014-07-02", guardianName: "Chukwudi Nwosu", guardianPhone: "+234 803 000 0002" },
  { admissionNo: "BDA/2026/003", fullName: "Fatima Bello", gender: "Female", dob: "2014-01-25", guardianName: "Aisha Bello", guardianPhone: "+234 803 000 0003" },
  { admissionNo: "BDA/2026/004", fullName: "Ibrahim Musa", gender: "Male", dob: "2013-11-09", guardianName: "Musa Abdullahi", guardianPhone: "+234 803 000 0004" },
  { admissionNo: "BDA/2026/005", fullName: "Oluwaseun Adeyemi", gender: "Male", dob: "2014-05-18", guardianName: "Bola Adeyemi", guardianPhone: "+234 803 000 0005" },
  { admissionNo: "BDA/2026/006", fullName: "Ngozi Eze", gender: "Female", dob: "2014-09-30", guardianName: "Uche Eze", guardianPhone: "+234 803 000 0006" },
  { admissionNo: "BDA/2026/007", fullName: "Adebayo Ogunleye", gender: "Male", dob: "2014-02-14", guardianName: "Funke Ogunleye", guardianPhone: "+234 803 000 0007" },
  { admissionNo: "BDA/2026/008", fullName: "Zainab Abubakar", gender: "Female", dob: "2014-06-06", guardianName: "Hauwa Abubakar", guardianPhone: "+234 803 000 0008" },
  { admissionNo: "BDA/2026/009", fullName: "Chinedu Okeke", gender: "Male", dob: "2013-12-21", guardianName: "Nkechi Okeke", guardianPhone: "+234 803 000 0009" },
  { admissionNo: "BDA/2026/010", fullName: "Temitope Alabi", gender: "Female", dob: "2014-04-03", guardianName: "Kunle Alabi", guardianPhone: "+234 803 000 0010" },
];

async function main() {
  if (await prisma.school.findUnique({ where: { slug: DEMO_SLUG } })) {
    console.log("Demo school already exists, nothing to do. Run `npm run db:reset` for a clean database.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.$transaction(
    async (tx) => {
      await tx.user.create({
        data: { email: "superadmin@brillanda.local", passwordHash, fullName: "Brillanda Support", role: "SUPER_ADMIN", status: "ACTIVE" },
      });

      const school = await tx.school.create({
        data: {
          name: "Brillanda Demo Academy",
          slug: DEMO_SLUG,
          motto: "Knowledge and Character",
          address: "12 Unity Road, Ikeja, Lagos",
          contactEmail: "office@demo-academy.local",
          contactPhone: "+234 800 000 0000",
          settings: DEFAULT_SCHOOL_SETTINGS,
        },
      });
      const schoolId = school.id;

      const createUser = (email: string, fullName: string, role: "SCHOOL_ADMIN" | "TEACHER" | "PARENT") =>
        tx.user.create({ data: { schoolId, email, passwordHash, fullName, role, status: "ACTIVE" } });

      await createUser("admin@demo-academy.local", "Grace Okafor", "SCHOOL_ADMIN");
      const tunde = await createUser("tunde.bakare@demo-academy.local", "Tunde Bakare", "TEACHER");
      const amaka = await createUser("amaka.eze@demo-academy.local", "Amaka Eze", "TEACHER");

      const session = await tx.academicSession.create({
        data: { schoolId, name: "2026/2027", isActive: true, startDate: new Date("2026-09-14") },
      });
      await tx.term.createMany({
        data: DEFAULT_TERM_NAMES.map((name, i) => ({ schoolId, sessionId: session.id, name, order: i + 1, isActive: i === 0 })),
      });

      const jss1 = await tx.class.create({ data: { schoolId, name: "JSS 1", order: 1 } });
      const jss1a = await tx.arm.create({ data: { schoolId, classId: jss1.id, name: "JSS 1A" } });

      const subjects = await tx.subject.createManyAndReturn({
        data: DEFAULT_SUBJECTS.map((s) => ({ schoolId, ...s })),
      });
      await tx.classSubject.createMany({
        data: subjects.map((s) => ({ schoolId, classId: jss1.id, subjectId: s.id })),
      });
      const subjectId = (name: string) => {
        const subject = subjects.find((s) => s.name === name);
        if (!subject) throw new Error(`Seed subject missing: ${name}`);
        return subject.id;
      };

      const placement = { schoolId, sessionId: session.id, classId: jss1.id, armId: jss1a.id };

      await tx.teacherAssignment.createMany({
        data: [
          { ...placement, teacherId: tunde.id, subjectId: subjectId("Mathematics") },
          { ...placement, teacherId: tunde.id, subjectId: subjectId("Basic Science") },
          { ...placement, teacherId: tunde.id, isClassTeacher: true },
          { ...placement, teacherId: amaka.id, subjectId: subjectId("English Language") },
        ],
      });

      await tx.assessmentComponent.createMany({
        data: DEFAULT_ASSESSMENT_COMPONENTS.map((c) => ({ schoolId, sessionId: session.id, ...c })),
      });
      await tx.gradingScaleEntry.createMany({
        data: DEFAULT_GRADING_SCALE.map((g) => ({ schoolId, sessionId: session.id, ...g })),
      });

      const students = [];
      for (const s of STUDENTS) {
        const student = await tx.student.create({ data: { schoolId, ...s, dob: new Date(s.dob) } });
        await tx.enrollment.create({ data: { ...placement, studentId: student.id } });
        students.push(student);
      }

      const parent = await createUser("parent@demo-academy.local", "Ifeoma Obi", "PARENT");
      await tx.parentStudent.create({
        data: { schoolId, parentId: parent.id, studentId: students[0]!.id, relationship: "Mother" },
      });
    },
    { timeout: 30_000 },
  );

  console.log(`
Seeded "Brillanda Demo Academy" (2026/2027, First Term active, JSS 1A with ${STUDENTS.length} students).
All demo accounts use the password: ${DEMO_PASSWORD}

  Super admin    superadmin@brillanda.local
  School admin   admin@demo-academy.local
  Teacher        tunde.bakare@demo-academy.local   (Mathematics, Basic Science; class teacher JSS 1A)
  Teacher        amaka.eze@demo-academy.local      (English Language)
  Parent         parent@demo-academy.local         (child: Chiamaka Obi)
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
