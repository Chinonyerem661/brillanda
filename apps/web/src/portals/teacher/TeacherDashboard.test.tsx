import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { MOCK_TERM } from "../../mocks/db";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { TeacherDashboard } from "./TeacherDashboard";

describe("teacher dashboard", () => {
  it("lists the teacher's classes with their progress", async () => {
    renderWithProviders(<TeacherDashboard />);

    const link = await screen.findByRole("link", { name: /Basic Science.*JSS 1A/ });
    expect(link).toHaveAttribute("href", `/teacher/score-entry/arm-jss1a/subject-basic-science/${MOCK_TERM.id}`);
    expect(within(link).getByText("6 of 10 students done")).toBeInTheDocument();
    expect(within(link).getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("says how many classes are finished", async () => {
    renderWithProviders(<TeacherDashboard />);
    const summary = await screen.findByText(/You've finished/);
    expect(summary).toHaveTextContent(/First Term, 2026\/2027/);
    expect(within(summary).getByText("1", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("tells a teacher without classes what to do", async () => {
    server.use(http.get("/api/v1/teacher/assignments", () => HttpResponse.json({ term: MOCK_TERM, assignments: [] })));
    renderWithProviders(<TeacherDashboard />);
    expect(await screen.findByText(/Ask your school admin to assign you/)).toBeInTheDocument();
  });
});
