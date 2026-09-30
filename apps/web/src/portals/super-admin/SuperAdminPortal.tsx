import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../../shared/auth/authStore";
import { Card } from "../../shared/components/Cards";
import { PageHeader } from "../../shared/components/PageHeader";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { useLook } from "../../shared/theme/useLook";
import { cx } from "../../shared/utils/cx";
import { ActivityPage } from "./ActivityPage";
import { isOpen, useTrialRequests } from "./api";
import { OverviewPage } from "./OverviewPage";
import { SchoolsPage } from "./SchoolsPage";
import { TrialRequestsPage } from "./TrialRequestsPage";

// The Brillanda team portal (SUPER_ADMIN), built from the prototype (design/prototype).
export default function SuperAdminPortal() {
  const trials = useTrialRequests();
  const waiting = trials.data?.filter(isOpen).length ?? 0;

  const nav: NavItem[] = [
    { to: "/super-admin", label: "Overview", icon: "home", end: true },
    { to: "/super-admin/schools", label: "Schools", icon: "school" },
    { to: "/super-admin/trials", label: "Trial requests", short: "Trials", icon: "inbox", count: waiting },
    { to: "/super-admin/activity", label: "Activity", icon: "activity" },
    { to: "/super-admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <Routes>
      <Route
        element={
          <AppShell
            nav={nav}
            note={
              <>
                <b className="mb-0.5 block text-text-primary">Trial requests</b>
                {waiting ? `${waiting} waiting for you` : "None waiting"}
              </>
            }
          />
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="trials" element={<TrialRequestsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Route>
    </Routes>
  );
}

/** Who is signed in, and the look. Email preferences come with the notifications endpoint. */
function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { look, setLook } = useLook();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-2xl gap-4">
        <Card title="Your profile" description="Brillanda team">
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
            <dt className="text-text-secondary">Name</dt>
            <dd className="m-0 font-medium">{user?.fullName}</dd>
            <dt className="text-text-secondary">Email</dt>
            <dd className="m-0 break-all font-medium">{user?.email}</dd>
          </dl>
        </Card>
        <Card title="Look" description="How Brillanda looks on this device.">
          <div role="group" aria-label="Look" className="inline-grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
            {(["pastel", "neutral"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={look === value}
                onClick={() => setLook(value)}
                className={cx(
                  "h-9 rounded-full px-5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  look === value ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
