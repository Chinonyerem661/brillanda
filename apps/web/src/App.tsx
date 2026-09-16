import { useEffect, useState } from "react";

type ApiState = "checking" | "ok" | "down";

const API_LABEL: Record<ApiState, { text: string; className: string }> = {
  checking: { text: "Checking…", className: "bg-bg text-text-secondary" },
  ok: { text: "Connected", className: "bg-success-bg text-success" },
  down: { text: "Not reachable", className: "bg-danger-bg text-danger" },
};

// Placeholder shell until the login screen lands in Phase 1 step 2.
export default function App() {
  const [api, setApi] = useState<ApiState>("checking");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => setApi(res.ok ? "ok" : "down"))
      .catch(() => setApi("down"));
  }, []);

  const label = API_LABEL[api];

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Brillanda</h1>
        <p className="mt-1 text-text-secondary">School results &amp; records</p>
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-text-muted">API</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${label.className}`}>{label.text}</span>
        </div>
      </div>
    </main>
  );
}
