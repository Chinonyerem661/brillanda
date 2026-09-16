// Regional defaults (FR-6.2, FR-11.2, FR-23.4): a new school can accept all of these and
// start entering scores immediately. Used by the onboarding wizard and the seed script.

export const DEFAULT_TERM_NAMES = ["First Term", "Second Term", "Third Term"];

export const DEFAULT_CLASS_NAMES = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

export const DEFAULT_SUBJECTS = [
  { name: "Mathematics", code: "MTH" },
  { name: "English Language", code: "ENG" },
  { name: "Basic Science", code: "BSC" },
  { name: "Basic Technology", code: "BTE" },
  { name: "Social Studies", code: "SOS" },
  { name: "Civic Education", code: "CIV" },
  { name: "Computer Studies", code: "CMP" },
  { name: "Agricultural Science", code: "AGR" },
];

/** Standard 40/60 CA/Exam split. Weights sum to 100. */
export const DEFAULT_ASSESSMENT_COMPONENTS = [
  { name: "CA1", weight: 20, maxScore: 20, order: 1 },
  { name: "CA2", weight: 20, maxScore: 20, order: 2 },
  { name: "Exam", weight: 60, maxScore: 60, order: 3 },
];

/** Bands are thresholds: a total gets the highest band whose minScore it reaches. */
export const DEFAULT_GRADING_SCALE = [
  { minScore: 70, grade: "A", remark: "Excellent", isPass: true },
  { minScore: 60, grade: "B", remark: "Very Good", isPass: true },
  { minScore: 50, grade: "C", remark: "Good", isPass: true },
  { minScore: 45, grade: "D", remark: "Fair", isPass: true },
  { minScore: 40, grade: "E", remark: "Pass", isPass: true },
  { minScore: 0, grade: "F", remark: "Fail", isPass: false },
];
