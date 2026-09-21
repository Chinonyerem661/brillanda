import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { PageSpinner } from "../components/Spinner";
import { TextField } from "../components/TextField";
import { authApi } from "./authApi";
import { AuthLayout } from "./AuthLayout";
import { useAuthStore } from "./authStore";
import { fieldError, generalError } from "./LoginPage";
import { homePathFor } from "./session";

const backToLogin = (
  <Link to="/login" className="font-medium text-text-primary underline-offset-4 hover:underline">
    Back to log in
  </Link>
);

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const request = useMutation({ mutationFn: () => authApi.forgotPassword(email) });

  if (request.isSuccess) {
    return (
      <AuthLayout
        title="Check your email"
        description={`If ${email} has a Brillanda account, we've sent it a link to choose a new password. The link works for 1 hour.`}
        footer={backToLogin}
      >
        <p className="text-sm text-text-secondary">Nothing arrived? Check your spam folder, or ask your school admin.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you log in with and we'll send you a link to choose a new password."
      footer={backToLogin}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          request.mutate();
        }}
        className="space-y-5"
        noValidate
      >
        {generalError(request.error) && <Alert tone="danger">{generalError(request.error)}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(request.error, "email")}
        />
        <Button type="submit" className="w-full" loading={request.isPending}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Password + confirmation, checked for a match before anything is sent. */
function NewPasswordForm({
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    onSubmit(password);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {generalError(error) && <Alert tone="danger">{generalError(error)}</Alert>}
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldError(error, "password")}
      />
      <TextField
        label="Type it again"
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        error={mismatch ? "The two passwords don't match" : undefined}
      />
      <Button type="submit" className="w-full" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const reset = useMutation({ mutationFn: (password: string) => authApi.resetPassword(token, password) });

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Password changed" description="You've been logged out everywhere else. Log in with your new password.">
        <Link to="/login">
          <Button className="w-full">Log in</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" footer={backToLogin}>
      <NewPasswordForm submitLabel="Change password" pending={reset.isPending} error={reset.error} onSubmit={reset.mutate} />
    </AuthLayout>
  );
}

export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => authApi.getInvite(token), retry: false });
  const accept = useMutation({
    mutationFn: (password: string) => authApi.acceptInvite(token, password),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session.accessToken, session.user);
      navigate(homePathFor(session.user.role), { replace: true });
    },
  });

  if (invite.isPending) return <PageSpinner fullScreen />;
  if (invite.isError) {
    return (
      <AuthLayout title="This invite can't be used" description={invite.error.message} footer={backToLogin}>
        <p className="text-sm text-text-secondary">Invite links work once and expire after 3 days.</p>
      </AuthLayout>
    );
  }

  const firstName = invite.data.fullName.split(" ")[0];
  return (
    <AuthLayout
      title={invite.data.schoolName ? `Join ${invite.data.schoolName}` : "Join Brillanda"}
      description={`Hi ${firstName}, choose a password to finish setting up your account for ${invite.data.email}.`}
    >
      <NewPasswordForm submitLabel="Create account" pending={accept.isPending} error={accept.error} onSubmit={accept.mutate} />
    </AuthLayout>
  );
}
