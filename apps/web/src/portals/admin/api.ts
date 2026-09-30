import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminOverview,
  AdminSheet,
  AdminStudent,
  ArmDetail,
  ArmSummary,
  GradingScaleBody,
  InviteParentRequest,
  InviteStaffRequest,
  PendingUnlockRequest,
  PublishResponse,
  ReportCard,
  SchoolProfile,
  StaffMember,
  TermDates,
} from "@brillanda/shared-types";
import { api } from "../../shared/api/client";

// Data for the school admin portal (packages/shared-types/src/admin.ts, DECISIONS.md F-37).

const KEY = ["admin"] as const;
export const adminKeys = {
  all: KEY,
  overview: [...KEY, "overview"] as const,
  arms: [...KEY, "arms"] as const,
  arm: (id: string) => [...KEY, "arms", id] as const,
  sheet: (armId: string, subjectId: string) => [...KEY, "sheet", armId, subjectId] as const,
  unlocks: [...KEY, "unlock-requests"] as const,
  students: [...KEY, "students"] as const,
  staff: [...KEY, "staff"] as const,
  reportCard: (studentId: string) => [...KEY, "report-card", studentId] as const,
  school: [...KEY, "school"] as const,
  term: [...KEY, "term"] as const,
  scale: [...KEY, "grading-scale"] as const,
};

export const useOverview = () => useQuery({ queryKey: adminKeys.overview, queryFn: () => api<AdminOverview>("/admin/overview") });
export const useArms = () => useQuery({ queryKey: adminKeys.arms, queryFn: () => api<ArmSummary[]>("/admin/arms") });
export const useArm = (id: string) => useQuery({ queryKey: adminKeys.arm(id), queryFn: () => api<ArmDetail>(`/admin/arms/${encodeURIComponent(id)}`) });
export const useAdminSheet = (armId: string, subjectId: string) =>
  useQuery({ queryKey: adminKeys.sheet(armId, subjectId), queryFn: () => api<AdminSheet>(`/admin/sheets?${new URLSearchParams({ armId, subjectId })}`) });
export const useUnlockRequests = () => useQuery({ queryKey: adminKeys.unlocks, queryFn: () => api<PendingUnlockRequest[]>("/admin/unlock-requests") });
export const useStudents = () => useQuery({ queryKey: adminKeys.students, queryFn: () => api<AdminStudent[]>("/admin/students") });
export const useStaff = () => useQuery({ queryKey: adminKeys.staff, queryFn: () => api<StaffMember[]>("/admin/staff") });
export const useReportCard = (studentId: string | null) =>
  useQuery({ queryKey: adminKeys.reportCard(studentId ?? ""), queryFn: () => api<ReportCard>(`/admin/report-cards/${encodeURIComponent(studentId!)}`), enabled: !!studentId });
export const useSchoolProfile = () => useQuery({ queryKey: adminKeys.school, queryFn: () => api<SchoolProfile>("/admin/school") });
export const useTermDates = () => useQuery({ queryKey: adminKeys.term, queryFn: () => api<TermDates>("/admin/term") });
export const useGradingScale = () => useQuery({ queryKey: adminKeys.scale, queryFn: () => api<GradingScaleBody>("/admin/grading-scale") });

/** A change can move any figure on any admin page, so everything admin is refreshed. */
function useAdminMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }) });
}

const send = <T>(path: string, method: "POST" | "PUT", body?: unknown) => api<T>(path, { method, body });

export const useDecideUnlock = () =>
  useAdminMutation(({ id, decision }: { id: string; decision: "approve" | "decline" }) => send<void>(`/admin/unlock-requests/${encodeURIComponent(id)}/${decision}`, "POST"));
export const useSendReminders = () =>
  useAdminMutation((body: { teacherIds: string[]; note?: string }) => send<{ sent: number }>("/admin/reminders", "POST", body));
export const usePublish = () => useAdminMutation((armIds: string[]) => send<PublishResponse>("/admin/publish", "POST", { armIds }));
export const useInviteParent = () =>
  useAdminMutation(({ studentId, ...body }: InviteParentRequest & { studentId: string }) => send<void>(`/admin/students/${encodeURIComponent(studentId)}/invite-parent`, "POST", body));
export const useInviteStaff = () => useAdminMutation((body: InviteStaffRequest) => send<{ resent: boolean }>("/users/invite", "POST", body));
export const useSaveSchool = () => useAdminMutation((body: SchoolProfile) => send<SchoolProfile>("/admin/school", "PUT", body));
export const useSaveTerm = () => useAdminMutation((body: TermDates) => send<TermDates>("/admin/term", "PUT", body));
export const useSaveScale = () => useAdminMutation((body: GradingScaleBody) => send<GradingScaleBody>("/admin/grading-scale", "PUT", body));

/** JSS 1 to JSS 3, then SS 1 to SS 3: how the school groups its classes. */
export const SECTIONS = [
  { id: "junior", name: "Junior secondary", range: "JSS 1 to JSS 3", orders: [0, 1, 2], tintLevel: 0 },
  { id: "senior", name: "Senior secondary", range: "SS 1 to SS 3", orders: [3, 4, 5], tintLevel: 3 },
] as const;

export const isDone = (status: string) => status === "COMPLETE" || status === "LOCKED";
