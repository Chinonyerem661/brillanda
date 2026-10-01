import type { EntryState, GradeBand, ParentStatus, SchoolProfile, TermDates } from "@brillanda/shared-types";
import { MOCK_COMPONENTS, MOCK_GRADING_SCALE, MOCK_TERM } from "./db";

// Stand-in data for the school admin portal (DECISIONS.md D-7, F-37): one whole school, 12 arms
// and 9 subjects, generated from a fixed seed so every run looks the same. Kept in localStorage so
// changes survive a reload. The teacher portal still has its own small sample (mocks/db.ts); the
// two join up once the real API serves both. Delete this file when the admin endpoints ship.

const STORAGE_KEY = "brillanda:school-v3";
const DAY = 86_400_000;

/** A score cell: a number, "ABS" for absent, or null for not entered yet. */
export type Cell = number | "ABS" | null;
export type Sheet = { status: EntryState; scores: Record<string, [Cell, Cell, Cell]>; remindedAt: string | null };
export type StaffRecord = { id: string; fullName: string; email: string; role: "TEACHER" | "SCHOOL_ADMIN"; status: "ACTIVE" | "INVITED" };
export type UnlockRecord = { id: string; armId: string; subjectId: string; reason: string; requestedById: string; createdAt: string; status: "PENDING" | "APPROVED" | "REJECTED" };

export type SchoolDb = {
  profile: SchoolProfile;
  term: TermDates;
  scale: GradeBand[];
  classes: { id: string; name: string; order: number }[];
  arms: { id: string; name: string; classId: string; formTeacherId: string }[];
  subjects: { id: string; name: string }[];
  staff: StaffRecord[];
  /** Who teaches each subject in each arm, by `${armId}:${subjectId}`. */
  teacherOf: Record<string, string>;
  students: { id: string; fullName: string; admissionNo: string; armId: string; parentStatus: ParentStatus }[];
  sheets: Record<string, Sheet>;
  unlocks: UnlockRecord[];
  /** When each arm was published, by arm id. */
  published: Record<string, string>;
  /** Published terms a parent has opened, as `${studentId}:${termId}` (the parent portal's "New" markers). */
  parentSeen: string[];
};

/** The sample parent's children: real students of the sample school, so publishing reaches them. */
export const SAMPLE_CHILDREN = [
  { id: "student-chiamaka", fullName: "Chiamaka Okafor", armId: "arm-jss2b", ability: 76 },
  { id: "student-obinna", fullName: "Obinna Okafor", armId: "arm-ss3a", ability: 66 },
];

export const sheetId = (armId: string, subjectId: string) => `${armId}:${subjectId}`;
export const COMPONENTS = MOCK_COMPONENTS;
export const TERM = MOCK_TERM;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Adaeze", "Ifeanyi", "Tolu", "Zainab", "David", "Chisom", "Emeka", "Fatima", "Olumide", "Kemi", "Sade", "Musa", "Halima", "Ebuka", "Amaka", "Yusuf", "Blessing", "Tobi", "Femi", "Aisha", "Uche", "Nneka", "Segun", "Bisola", "Ikenna", "Temi", "Ada", "Funke", "Kelechi", "Nkechi", "Seun", "Dayo", "Ireti", "Somto", "Hauwa", "Precious", "Daniel", "Esther", "Joshua", "Grace", "Victor", "Ruth", "Samuel", "Deborah", "Ibrahim", "Maryam", "Chidi", "Oluwaseun"];
const LAST = ["Adeyemi", "Bello", "Eze", "Nwosu", "Okon", "Danjuma", "Ibe", "Lawal", "Adewale", "Obi", "Yusuf", "Etim", "Nnaji", "Balogun", "Uzor", "Ogunleye", "Abubakar", "Chukwu", "Ojo", "Afolabi", "Onyeka", "Salami", "Mohammed", "Olatunji", "Akande", "Nwachukwu", "Oyelaran", "Ekanem", "Okoro", "Ajayi"];

function seed(now = Date.now()): SchoolDb {
  const r = rng(2026);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].map((name, order) => ({ id: `class-${order + 1}`, name, order }));
  const subjects = [
    ["subject-maths", "Mathematics"], ["subject-english", "English Language"], ["subject-computer", "Computer Studies"],
    ["subject-agric", "Agricultural Science"], ["subject-phe", "Physical and Health Education"], ["subject-civic", "Civic Education"],
    ["subject-crs", "Christian Religious Studies"], ["subject-french", "French"], ["subject-yoruba", "Yoruba"],
  ].map(([id, name]) => ({ id: id!, name: name! }));

  const staff: StaffRecord[] = [
    ["t-bakare", "Tunde Bakare"], ["t-ajayi", "Femi Ajayi"], ["t-okon", "Grace Okon"], ["t-bello", "Halima Bello"], ["t-eze", "Chinedu Eze"],
    ["t-nwosu", "Emeka Nwosu"], ["t-danjuma", "Musa Danjuma"], ["t-ibe", "Ngozi Ibe"], ["t-lawal", "Aisha Lawal"], ["t-adewale", "Bisi Adewale"],
  ].map(([id, fullName]) => ({ id: id!, fullName: fullName!, email: `${fullName!.split(" ")[0]![0]!.toLowerCase()}.${fullName!.split(" ")[1]!.toLowerCase()}@greenfield.sch.ng`, role: "TEACHER", status: "ACTIVE" }));
  staff.push({ id: "a-adeyemi", fullName: "Funmilayo Adeyemi", email: "f.adeyemi@greenfield.sch.ng", role: "SCHOOL_ADMIN", status: "ACTIVE" });

  const subjectTeacher: Record<string, string> = {
    "subject-english": "t-okon", "subject-computer": "t-bello", "subject-agric": "t-eze", "subject-phe": "t-nwosu",
    "subject-civic": "t-danjuma", "subject-crs": "t-ibe", "subject-french": "t-lawal", "subject-yoruba": "t-adewale",
  };
  const bakareArms = ["arm-jss2a", "arm-jss2b", "arm-ss1a", "arm-ss2a"];
  const formTeachers = ["t-okon", "t-bello", "t-bakare", "t-danjuma", "t-eze", "t-ibe", "t-nwosu", "t-lawal", "t-adewale", "t-okon", "t-danjuma", "t-bello"];

  const arms = classes.flatMap((cls) =>
    ["A", "B"].map((letter) => ({ id: `arm-${cls.name.replace(" ", "").toLowerCase()}${letter.toLowerCase()}`, name: `${cls.name}${letter}`, classId: cls.id, formTeacherId: "" })),
  );
  arms.forEach((arm, i) => (arm.formTeacherId = formTeachers[i]!));

  const teacherOf: Record<string, string> = {};
  for (const arm of arms) for (const s of subjects) teacherOf[sheetId(arm.id, s.id)] = s.id === "subject-maths" ? (bakareArms.includes(arm.id) ? "t-bakare" : "t-ajayi") : subjectTeacher[s.id]!;

  const used = new Set<string>();
  const students: SchoolDb["students"] = [];
  const ability: Record<string, number> = {};
  arms.forEach((arm, ai) => {
    const n = 26 + Math.floor(r() * 9);
    for (let k = 0; k < n; k++) {
      let name: string;
      do name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; while (used.has(name));
      used.add(name);
      const id = `student-${arm.id.slice(4)}-${k + 1}`;
      ability[id] = Math.max(28, Math.min(95, 62 + (r() + r() + r() - 1.5) * 34));
      students.push({ id, fullName: name, admissionNo: `GC/2026/${String(ai + 1).padStart(2, "0")}${String(k + 1).padStart(2, "0")}`, armId: arm.id, parentStatus: r() < 0.93 ? "LINKED" : "NONE" });
    }
  });
  for (const child of SAMPLE_CHILDREN) {
    const s = students.find((x) => x.armId === child.armId)!;
    delete ability[s.id];
    Object.assign(s, { id: child.id, fullName: child.fullName, parentStatus: "LINKED" });
    ability[child.id] = child.ability;
  }
  students.sort((a, b) => (a.armId === b.armId ? a.fullName.split(" ")[1]!.localeCompare(b.fullName.split(" ")[1]!) : 0));

  // Where each sheet stands, then scores to match.
  const state: Record<string, { status: EntryState; share: number }> = {};
  for (const arm of arms) for (const s of subjects) {
    const x = r();
    state[sheetId(arm.id, s.id)] = x < 0.1 ? { status: "NOT_STARTED", share: 0 } : x < 0.36 ? { status: "IN_PROGRESS", share: 0.25 + r() * 0.65 } : { status: "COMPLETE", share: 1 };
  }
  const set = (armId: string, subjectId: string, status: EntryState, share: number) => (state[sheetId(armId, subjectId)] = { status, share });
  for (const s of subjects) { set("arm-jss1a", s.id, "COMPLETE", 1); set("arm-ss3a", s.id, "COMPLETE", 1); }
  subjects.slice(0, 3).forEach((s) => set("arm-ss3b", s.id, "LOCKED", 1));
  subjects.forEach((s, i) => { if (i % 3 !== 1) set("arm-jss2b", s.id, i % 2 ? "NOT_STARTED" : "IN_PROGRESS", i % 2 ? 0 : 0.18 + i * 0.04); });
  set("arm-jss2a", "subject-maths", "IN_PROGRESS", 1);
  set("arm-jss2b", "subject-maths", "IN_PROGRESS", 0.58);
  set("arm-ss1a", "subject-maths", "NOT_STARTED", 0);
  set("arm-ss2a", "subject-maths", "LOCKED", 1);
  // A teacher can only ask to reopen a sheet they have marked complete (the two requests below).
  set("arm-jss3a", "subject-agric", "COMPLETE", 1);
  set("arm-ss2b", "subject-english", "COMPLETE", 1);

  const sheets: Record<string, Sheet> = {};
  for (const arm of arms) for (const s of subjects) {
    const key = sheetId(arm.id, s.id);
    const list = students.filter((st) => st.armId === arm.id);
    const full = Math.round(list.length * state[key]!.share);
    const scores: Sheet["scores"] = {};
    list.forEach((st, i) => {
      const score = (max: number) => Math.round((max * Math.max(8, Math.min(100, ability[st.id]! + (r() - 0.5) * 26))) / 100);
      if (i < full) scores[st.id] = [score(20), score(20), r() < 0.012 ? "ABS" : score(60)];
      else if (i === full && state[key]!.status === "IN_PROGRESS") scores[st.id] = [score(20), null, null];
      else scores[st.id] = [null, null, null];
    });
    sheets[key] = { status: state[key]!.status, scores, remindedAt: null };
  }

  return {
    profile: { name: "Greenfield College", motto: "Knowledge, character, service", address: "Lekki, Lagos" },
    term: { startsOn: iso(now - 74 * DAY), endsOn: iso(now + 16 * DAY), scoresDueOn: iso(now + 9 * DAY), nextTermBegins: iso(now + 104 * DAY) },
    scale: MOCK_GRADING_SCALE,
    classes,
    arms,
    subjects,
    staff,
    teacherOf,
    students,
    sheets,
    unlocks: [
      { id: "unlock-1", armId: "arm-jss3a", subjectId: "subject-agric", reason: "Two continuous assessment scores went into the wrong column.", requestedById: "t-eze", createdAt: new Date(now - 2 * 3_600_000).toISOString(), status: "PENDING" },
      { id: "unlock-2", armId: "arm-ss2b", subjectId: "subject-english", reason: "One student's exam script turned up after I marked the sheet complete.", requestedById: "t-okon", createdAt: new Date(now - DAY).toISOString(), status: "PENDING" },
    ],
    published: {},
    parentSeen: [],
  };
}

export function loadSchool(): SchoolDb {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as SchoolDb;
  } catch {
    // Unreadable or blocked storage: start again from the seed.
  }
  const fresh = seed();
  saveSchool(fresh);
  return fresh;
}

export function saveSchool(db: SchoolDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Private browsing: changes last until the tab closes.
  }
}

export function resetSchool() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved.
  }
}
