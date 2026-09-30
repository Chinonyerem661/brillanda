import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { useOverview } from "./api";
import { AdminSheetPage, ArmPage } from "./ArmPage";
import { ClassesPage } from "./ClassesPage";
import { HomePage } from "./HomePage";
import { PublishingPage } from "./PublishingPage";
import { SettingsPage } from "./SettingsPage";
import { StaffPage } from "./StaffPage";
import { StudentsPage } from "./StudentsPage";

// The school admin portal, built from the prototype (design/prototype).
export default function AdminPortal() {
  const overview = useOverview();
  const ready = overview.data?.armsReadyToPublish ?? 0;

  const nav: NavItem[] = [
    { to: "/admin", label: "Home", icon: "home", end: true },
    { to: "/admin/classes", label: "Classes", icon: "classes" },
    { to: "/admin/publishing", label: "Publishing", short: "Publish", icon: "publish", count: ready },
    { to: "/admin/students", label: "Students", icon: "students" },
    { to: "/admin/staff", label: "Staff", icon: "staff" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <Routes>
      <Route
        element={
          <AppShell
            nav={nav}
            note={
              <>
                <b className="mb-0.5 block text-text-primary">Coming soon</b>
                Attendance, fees, timetable and messages.
              </>
            }
          />
        }
      >
        <Route index element={<HomePage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:armId" element={<ArmPage />} />
        <Route path="classes/:armId/sheets/:subjectId" element={<AdminSheetPage />} />
        <Route path="publishing" element={<PublishingPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
