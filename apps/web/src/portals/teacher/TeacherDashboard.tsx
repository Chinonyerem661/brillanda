import type { TeacherAssignment } from "@brillanda/shared-types";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../shared/auth/authStore";
import { Alert } from "../../shared/components/Alert";
import { EntryStatusBadge } from "../../shared/components/Badge";
import { EmptyState } from "../../shared/components/EmptyState";
import { ChevronRight } from "../../shared/components/icons";
import { PageSpinner } from "../../shared/components/Spinner";
import { AnimatedNumber } from "../../shared/motion/AnimatedNumber";
import { useTeacherAssignments } from "./api";
import { RegisterStrip } from "./RegisterStrip";

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const isFinished = (assignment: TeacherAssignment) =>
  assignment.status === "COMPLETE" || assignment.status === "LOCKED";

export function TeacherDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data, isPending, error } = useTeacherAssignments();

  if (isPending) return <PageSpinner />;
  if (error) return <Alert tone="danger">{error.message}</Alert>;

  const firstName = user?.fullName.split(" ")[0];
  const { term, assignments } = data;
  const finished = assignments.filter(isFinished).length;

  return (
    <div className="space-y-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        {term && assignments.length > 0 && (
          <p className="mt-3 text-lg text-text-secondary">
            {term.name}, {term.sessionName}. You've finished <AnimatedNumber value={finished} /> of your{" "}
            {assignments.length} {assignments.length === 1 ? "class" : "classes"}.
          </p>
        )}
      </header>

      {!term ? (
        <EmptyState title="No term has started yet">
          Your school admin hasn't opened a term. Your classes will appear here as soon as they do.
        </EmptyState>
      ) : assignments.length === 0 ? (
        <EmptyState title="No classes yet">
          You haven't been given any classes for {term.name}. Ask your school admin to assign you to your subjects.
        </EmptyState>
      ) : (
        <section aria-labelledby="classes-heading">
          <h2 id="classes-heading" className="mb-4 text-sm font-medium text-text-secondary">
            Your classes
          </h2>
          <ul className="-mx-3 space-y-1">
            {assignments.map((assignment, index) => (
              <li key={`${assignment.armId}/${assignment.subjectId}`}>
                <AssignmentRow assignment={assignment} revealDelayMs={index * 140} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AssignmentRow({ assignment: a, revealDelayMs }: { assignment: TeacherAssignment; revealDelayMs: number }) {
  return (
    <Link
      to={`/teacher/score-entry/${a.armId}/${a.subjectId}/${a.termId}`}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 rounded-xl px-3 py-4 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-medium">{a.subjectName}</p>
        <p className="text-sm text-text-secondary">{a.armName}</p>
      </div>

      <div className="col-span-2 flex min-w-0 items-center gap-4 md:col-span-1">
        <div className="min-w-0 overflow-hidden">
          <RegisterStrip total={a.studentCount} filled={a.studentsComplete} delayMs={revealDelayMs} />
        </div>
        <span className="whitespace-nowrap text-sm tabular-nums text-text-secondary">
          {a.studentsComplete} of {a.studentCount} students done
        </span>
      </div>

      <div className="col-start-2 row-start-1 flex items-center gap-2 md:col-start-auto md:row-start-auto">
        <EntryStatusBadge status={a.status} />
        <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
