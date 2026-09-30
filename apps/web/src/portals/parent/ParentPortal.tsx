import type { NavItem } from "../../shared/layout/AppShell";
import { PlannedPortal } from "../../shared/layout/PlannedPortal";

// The parent portal's menu, from the prototype (design/prototype). Pages land in phase 3.
const NAV: NavItem[] = [
  { to: "/portal", label: "Home", icon: "home", end: true },
  { to: "/portal/results", label: "Results", icon: "results" },
  { to: "/portal/settings", label: "Settings", icon: "settings" },
];

export default function ParentPortal() {
  return <PlannedPortal nav={NAV} portalName="parent portal" />;
}
