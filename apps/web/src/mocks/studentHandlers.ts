import { delay, http, HttpResponse } from "msw";
import {
  admissionPatternProblems,
  formatAdmissionNo,
  sameAdmissionNo,
  type AdmissionNumberSettings,
  type EnrolStudentRequest,
  type EnrolStudentResponse,
  type LeaveSchoolRequest,
  type StudentRecord,
  type UpdateStudentRequest,
} from "@brillanda/shared-types";
import { loadSchool, newStudentRow, saveSchool, sessionStartYear, sheetId, takeAdmissionNo, type SchoolDb, type StudentRow } from "./schoolDb";

// Stand-ins for enrolment (packages/shared-types/src/admin.ts, DECISIONS.md F-40): enrolling one
// student, correcting their details, moving class, leaving and readmitting, and the school's
// admission number format. Delete with the rest of the stand-ins when the API ships.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LEFT = ["WITHDRAWN", "TRANSFERRED", "GRADUATED"];
const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });
const today = () => new Date().toISOString().slice(0, 10);
const tidy = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ") || null;

export function studentRecord(db: SchoolDb, st: StudentRow): StudentRecord {
  const arm = db.arms.find((a) => a.id === st.armId)!;
  const cls = db.classes.find((c) => c.id === arm.classId)!;
  return {
    id: st.id,
    fullName: st.fullName,
    admissionNo: st.admissionNo,
    armId: arm.id,
    armName: arm.name,
    classOrder: cls.order,
    parentStatus: st.parentStatus,
    gender: st.gender,
    status: st.status,
    dob: st.dob,
    guardian: st.guardian,
    joinedOn: st.joinedOn,
    left: st.left,
  };
}

/** Field problems shared by enrolling and editing. `self` is the student being edited. */
function problemsOf(db: SchoolDb, body: EnrolStudentRequest | UpdateStudentRequest, self?: StudentRow) {
  const errors: Record<string, string> = {};
  const name = tidy(body.fullName) ?? "";
  if (name.length < 2) errors.fullName = "Enter the student's full name.";
  else if (!name.includes(" ")) errors.fullName = "Add their surname too.";
  if (!db.arms.some((a) => a.id === body.armId)) errors.armId = "Pick a class.";
  if (body.gender && body.gender !== "MALE" && body.gender !== "FEMALE") errors.gender = "Pick male or female, or leave it blank.";
  if (body.dob) {
    const age = sessionStartYear() - Number(body.dob.slice(0, 4));
    if (!DATE.test(body.dob) || Number.isNaN(Date.parse(body.dob))) errors.dob = "Check the date of birth.";
    else if (age < 5 || age > 25) errors.dob = "That makes them " + age + " years old. Check the year.";
  }
  if (!body.joinedOn || !DATE.test(body.joinedOn)) errors.joinedOn = "Enter the day they joined.";
  else if (body.joinedOn > today()) errors.joinedOn = "That's in the future. Use the day they start.";
  const admissionNo = tidy(body.admissionNo);
  if (admissionNo) {
    const taken = db.students.find((s) => s !== self && sameAdmissionNo(s.admissionNo, admissionNo));
    if (taken) errors.admissionNo = `${taken.fullName} already has this number.`;
  } else if (self) errors.admissionNo = "Every student needs an admission number.";
  const email = tidy(body.guardian?.email);
  if (email && !EMAIL.test(email)) errors["guardian.email"] = "Check this email address. It should look like name@example.com.";
  const phone = tidy(body.guardian?.phone);
  if (phone && !/^\+?[\d\s-]{7,16}$/.test(phone)) errors["guardian.phone"] = "Check the phone number.";
  if ("inviteParent" in body && body.inviteParent && !email) errors["guardian.email"] = "Add an email to send the invite to.";
  return errors;
}

const guardianOf = (body: EnrolStudentRequest | UpdateStudentRequest) => ({
  name: tidy(body.guardian?.name),
  phone: tidy(body.guardian?.phone),
  email: tidy(body.guardian?.email)?.toLowerCase() ?? null,
});

/** Moves a student's scores this term from one arm's sheets to another's. */
function moveScores(db: SchoolDb, studentId: string, from: string, to: string) {
  for (const subject of db.subjects) {
    const old = db.sheets[sheetId(from, subject.id)];
    const next = db.sheets[sheetId(to, subject.id)];
    if (!old || !next) continue;
    if (old.scores[studentId]) next.scores[studentId] = old.scores[studentId]!;
    delete old.scores[studentId];
  }
}

export const studentHandlers = [
  http.get("/api/v1/admin/students/:id", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    return st ? HttpResponse.json<StudentRecord>(studentRecord(db, st)) : notFound();
  }),

  http.post("/api/v1/admin/students", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as EnrolStudentRequest;
    const db = loadSchool(request);
    const errors = problemsOf(db, body);
    if (Object.keys(errors).length) return invalid(errors);
    const guardian = guardianOf(body);
    const invite = body.inviteParent && !!guardian.email;
    const st = newStudentRow({
      id: `student-${Date.now()}`,
      fullName: tidy(body.fullName)!,
      admissionNo: tidy(body.admissionNo) ?? takeAdmissionNo(db),
      armId: body.armId,
      gender: body.gender,
      dob: body.dob,
      joinedOn: body.joinedOn,
      guardian,
      parentStatus: invite ? "INVITED" : "NONE",
    });
    db.students.push(st);
    saveSchool(db);
    return HttpResponse.json<EnrolStudentResponse>({ student: studentRecord(db, st), parentInvited: invite }, { status: 201 });
  }),

  http.put("/api/v1/admin/students/:id", async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as UpdateStudentRequest;
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    const errors = problemsOf(db, body, st);
    if (Object.keys(errors).length) return invalid(errors);
    if (body.armId !== st.armId) moveScores(db, st.id, st.armId, body.armId);
    Object.assign(st, {
      fullName: tidy(body.fullName)!,
      admissionNo: tidy(body.admissionNo)!,
      armId: body.armId,
      gender: body.gender,
      dob: body.dob,
      joinedOn: body.joinedOn,
      guardian: guardianOf(body),
    });
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.post("/api/v1/admin/students/:id/leave", async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as LeaveSchoolRequest;
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    if (st.status !== "ACTIVE") return HttpResponse.json({ error: `${st.fullName} has already left.` }, { status: 409 });
    const errors: Record<string, string> = {};
    if (!LEFT.includes(body.status)) errors.status = "Choose why they're leaving.";
    if (!body.on || !DATE.test(body.on)) errors.on = "Enter the day they left.";
    else if (body.on < st.joinedOn) errors.on = "That's before they joined.";
    else if (body.on > today()) errors.on = "That's in the future. Mark them as left on the day they go.";
    if (Object.keys(errors).length) return invalid(errors);
    st.status = body.status;
    st.left = { on: body.on, reason: tidy(body.reason) };
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.post("/api/v1/admin/students/:id/readmit", async ({ params, request }) => {
    await delay(400);
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    if (st.status === "ACTIVE") return HttpResponse.json({ error: `${st.fullName} is already a current student.` }, { status: 409 });
    st.status = "ACTIVE";
    st.left = null;
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.get("/api/v1/admin/admission-numbers", async ({ request }) => {
    await delay();
    const { admission } = loadSchool(request);
    return HttpResponse.json<AdmissionNumberSettings>({ ...admission, year: sessionStartYear(), preview: formatAdmissionNo(admission, sessionStartYear(), admission.next) });
  }),

  http.put("/api/v1/admin/admission-numbers", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as AdmissionNumberSettings;
    const format = { pattern: body.pattern?.trim() ?? "", digits: Number(body.digits) };
    const problems = admissionPatternProblems(format);
    if (problems.length) return invalid({ pattern: problems[0]! });
    if (!Number.isInteger(body.next) || body.next < 1) return invalid({ next: "Start from a whole number, 1 or more." });
    const db = loadSchool(request);
    const preview = formatAdmissionNo(format, sessionStartYear(), body.next);
    const taken = db.students.find((s) => sameAdmissionNo(s.admissionNo, preview));
    if (taken) return invalid({ next: `${taken.fullName} already has ${preview}. Start from a higher number.` });
    db.admission = { ...format, next: body.next };
    saveSchool(db);
    return HttpResponse.json<AdmissionNumberSettings>({ ...db.admission, year: sessionStartYear(), preview });
  }),
];
