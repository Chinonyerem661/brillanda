import type { GradeBand } from "./grading";
import type { EntryState, PublishState } from "./index";
import type { ScoreSheet, ScoreSheetComponent, TermRef } from "./teacher";

// API contract for the school admin portal (DECISIONS.md F-37). The web app is built against
// these shapes with stand-in data first; the API must return exactly these when it ships.

export type PersonRef = { id: string; fullName: string };

/** GET /admin/overview: the term at a glance. */
export type AdminOverview = {
  term: TermRef | null;
  /** Week of the term (1-based) and how many weeks it has; null outside a term. */
  week: { number: number; of: number } | null;
  scoresDueAt: string | null;
  /** One sheet = one subject in one arm. */
  sheets: { total: number; complete: number; inProgress: number; notStarted: number };
  /** Sheets complete at the end of each week so far, oldest first. */
  completeByWeek: number[];
  armsReadyToPublish: number;
  armsPublished: number;
  pendingUnlockRequests: number;
  students: number;
  studentsWithoutParent: number;
  /** Teachers with a sheet not started or under half done, most sheets first. */
  teachersBehind: { teacher: PersonRef; sheets: number }[];
};

/** One arm (JSS 1A) with where its sheets stand. */
export type ArmSummary = {
  id: string;
  name: string;
  className: string;
  /** Order of the class in the school, for grouping and colour (JSS 1 is 0). */
  classOrder: number;
  studentCount: number;
  formTeacher: PersonRef | null;
  /** Every subject's sheet state, in the school's subject order. */
  subjects: { subjectId: string; subjectName: string; status: EntryState }[];
  publishStatus: PublishState;
  pendingUnlockRequests: number;
};

export type UnlockRequestRef = { id: string; reason: string; requestedBy: PersonRef; createdAt: string };

/** GET /admin/arms/:armId */
export type ArmDetail = ArmSummary & {
  sheets: {
    subjectId: string;
    subjectName: string;
    teacher: PersonRef | null;
    status: EntryState;
    studentsComplete: number;
    unlockRequest: UnlockRequestRef | null;
    remindedAt: string | null;
  }[];
  students: {
    id: string;
    fullName: string;
    admissionNo: string;
    parentStatus: ParentStatus;
    /** Only once every subject is complete. */
    average: number | null;
    position: number | null;
  }[];
};

/** GET /admin/sheets?armId=&subjectId=: a read-only copy of a teacher's sheet. */
export type AdminSheet = ScoreSheet;

/** GET /admin/unlock-requests: pending requests, newest first. */
export type PendingUnlockRequest = UnlockRequestRef & { armId: string; armName: string; subjectId: string; subjectName: string };

/** POST /admin/reminders: an email and a note on each teacher's home screen. */
export type SendRemindersRequest = { teacherIds: string[]; note?: string };
export type SendRemindersResponse = { sent: number };

/** POST /admin/publish: publishes arms whose every sheet is complete, and emails their parents. */
export type PublishRequest = { armIds: string[] };
export type PublishResponse = { published: string[]; parentsEmailed: number; printedSlips: number };

/** GET /admin/report-cards/:studentId: what a parent will receive. */
export type ReportCard = {
  school: { name: string; motto: string | null; address: string | null };
  term: TermRef;
  student: { id: string; fullName: string; admissionNo: string; armName: string };
  subjects: { subjectName: string; scores: { component: string; maxScore: number; value: number | null; isAbsent: boolean }[]; total: number; grade: string; remark: string }[];
  average: number;
  position: number;
  of: number;
  classTeacherRemark: string | null;
  principalRemark: string | null;
  nextTermBegins: string | null;
  gradingScale: GradeBand[];
};

export type ParentStatus = "LINKED" | "INVITED" | "NONE";

/** GET /admin/students: every enrolled student this term. */
export type AdminStudent = { id: string; fullName: string; admissionNo: string; armId: string; armName: string; classOrder: number; parentStatus: ParentStatus };

/** POST /admin/students/:id/invite-parent */
export type InviteParentRequest = { fullName: string; email: string };

/** GET /admin/staff */
export type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: "TEACHER" | "SCHOOL_ADMIN";
  status: "ACTIVE" | "INVITED";
  subjects: string[];
  sheetsTotal: number;
  sheetsComplete: number;
};

/** POST /users/invite (built in the API, F-26). */
export type InviteStaffRequest = { fullName: string; email: string; role: "TEACHER" | "SCHOOL_ADMIN"; phone?: string };

/**
 * GET and PUT /admin/school. `logoUrl` is read-only here: it changes through
 * POST /admin/school/logo (multipart, field `logo`; returns SchoolLogoResponse) and DELETE /admin/school/logo.
 */
export type SchoolProfile = { name: string; motto: string | null; address: string | null; logoUrl?: string | null };
export type SchoolLogoResponse = { logoUrl: string | null };

/** GET and PUT /admin/term */
export type TermDates = { startsOn: string; endsOn: string; scoresDueOn: string; nextTermBegins: string | null };

/** GET and PUT /admin/grading-scale (scoped to the session, F-2). */
export type GradingScaleBody = { bands: GradeBand[] };

// ---- Getting a new school set up (Onboarding Flow §3, DECISIONS.md F-39) ----
// The Brillanda team creates the school with working defaults (F-36); nothing here blocks using it.

/** What the remaining setup checklist can hold, in the order it is shown. */
export type SetupItemId = "IMPORT_STUDENTS" | "INVITE_TEACHERS" | "CHECK_GRADING" | "UPLOAD_LOGO" | "SET_TERM";

/** GET /admin/setup */
export type SetupStatus = {
  /** False until the admin has tried one class or skipped ahead; the portal opens the first run until then. */
  firstRunDone: boolean;
  /** The defaults the school was created with, for the welcome screen. */
  defaults: {
    sessionName: string;
    terms: string[];
    classes: string[];
    arms: string[];
    subjects: string[];
    components: ScoreSheetComponent[];
    gradingScale: GradeBand[];
  };
  checklist: { id: SetupItemId; done: boolean }[];
  /** The admin hid the checklist before finishing it. */
  checklistHidden: boolean;
};

/**
 * POST /admin/setup/try-class: adds a few students to one arm, with placeholder admission numbers
 * the school corrects later, and returns the sheet to try. Scores then save through
 * PUT /scores/:studentId/:componentId like any other sheet; a school admin may enter scores for
 * their own school.
 */
export type TryClassRequest = { armId: string; subjectId: string; studentNames: string[] };
export type TryClassResponse = { sheet: ScoreSheet };

/** POST /admin/setup/first-run: the admin finished trying a class, or skipped it. No body. */
/** POST /admin/setup/checklist/hide and /show. No body. */
