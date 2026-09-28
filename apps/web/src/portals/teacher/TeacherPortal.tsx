import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { USING_SAMPLE_DATA } from "../../shared/api/sampleData";
import { useAuthStore } from "../../shared/auth/authStore";
import { useLogout } from "../../shared/auth/session";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { TeacherDashboard } from "./TeacherDashboard";
import { ScoreEntryPage } from "./score-entry/ScoreEntryPage";

// Deliberately minimal: no sidebar, no admin menus, just the teacher's classes (Build Guide §7).
export default function TeacherPortal() {
  return (
    <Routes>
      <Route element={<TeacherLayout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="score-entry/:armId/:subjectId/:termId" element={<ScoreEntryPage />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Route>
    </Routes>
  );
}

function TeacherLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/teacher"
          className="flex min-w-0 items-baseline gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="text-lg font-semibold tracking-tight">Brillanda</span>
          {user?.school && <span className="hidden truncate text-sm text-text-secondary sm:inline">{user.school.name}</span>}
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {USING_SAMPLE_DATA && (
            <Badge tone="warning" title="Classes and scores are stand-in data until their part of the backend is built">
              Sample data
            </Badge>
          )}
          <span className="hidden text-sm text-text-secondary md:inline">{user?.fullName}</span>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
