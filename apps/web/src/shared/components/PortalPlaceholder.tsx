import { AuthLayout } from "../auth/AuthLayout";
import { useAuthStore } from "../auth/authStore";
import { useLogout } from "../auth/session";
import { Button } from "./Button";

/** Stands in for a portal that isn't built yet, so every role can still sign in and out. */
export function PortalPlaceholder({ portalName }: { portalName: string }) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const firstName = user?.fullName.split(" ")[0];

  return (
    <AuthLayout
      title={firstName ? `Hi ${firstName}` : "Hi there"}
      description={`The ${portalName} is being built. You'll be able to use it here soon.`}
    >
      <Button variant="secondary" className="w-full" onClick={logout}>
        Sign out
      </Button>
    </AuthLayout>
  );
}
