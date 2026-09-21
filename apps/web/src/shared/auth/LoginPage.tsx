import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { SessionResponse } from "@brillanda/shared-types";
import { ApiError } from "../api/client";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { authApi } from "./authApi";
import { AuthLayout, TextButton } from "./AuthLayout";
import { useAuthStore } from "./authStore";
import { destinationAfterLogin } from "./session";

const startSession = (session: SessionResponse) => useAuthStore.getState().setSession(session.accessToken, session.user);

/** A general message only when the server didn't point at a specific field. */
export function generalError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return Object.keys(error.fields).length ? null : error.message;
  return "Something went wrong. Please try again.";
}

export const fieldError = (error: unknown, field: string) =>
  error instanceof ApiError ? error.fields[field]?.[0] : undefined;

export function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [mode, setMode] = useState<"email" | "code">("email");

  if (user) return <Navigate to={destinationAfterLogin(user.role, location.state)} replace />;

  if (mode === "code") {
    return (
      <AuthLayout
        title="Parent access"
        description="Enter the access code your child's school gave you."
        footer={
          <>
            Have an email and password? <TextButton onClick={() => setMode("email")}>Log in with email</TextButton>
          </>
        }
      >
        <AccessCodeForm />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Log in"
      description="Welcome back. Use the email your school added you with."
      footer={
        <>
          Parent with an access code? <TextButton onClick={() => setMode("code")}>Use your code</TextButton>
        </>
      }
    >
      <EmailLoginForm />
    </AuthLayout>
  );
}

function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({ mutationFn: () => authApi.login(email, password), onSuccess: startSession });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {generalError(login.error) && <Alert tone="danger">{generalError(login.error)}</Alert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError(login.error, "email")}
      />
      <div>
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError(login.error, "password")}
        />
        <Link
          to="/forgot-password"
          className="mt-2 inline-block text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
        >
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={login.isPending}>
        Log in
      </Button>
    </form>
  );
}

function AccessCodeForm() {
  const [code, setCode] = useState("");
  const login = useMutation({ mutationFn: () => authApi.loginWithCode(code), onSuccess: startSession });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        login.mutate();
      }}
      className="space-y-5"
      noValidate
    >
      {generalError(login.error) && <Alert tone="danger">{generalError(login.error)}</Alert>}
      <TextField
        label="Access code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="e.g. K7QM-2XPA-9RTD"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={fieldError(login.error, "code")}
      />
      <Button type="submit" className="w-full" loading={login.isPending}>
        Continue
      </Button>
    </form>
  );
}
