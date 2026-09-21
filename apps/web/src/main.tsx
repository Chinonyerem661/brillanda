import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

// Stand-in data for endpoints that aren't built yet (DECISIONS.md D-7). The condition is written
// inline so production builds drop the mock code entirely.
async function startSampleData() {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS === "false") return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}

startSampleData().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
