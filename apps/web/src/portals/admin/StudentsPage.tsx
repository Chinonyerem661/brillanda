import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { AdminStudent } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { plural } from "../../shared/utils/time";
import { SECTIONS, useInviteParent, useStudents } from "./api";
import { ParentBadge } from "./parts";

export function StudentsPage() {
  const students = useStudents();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<AdminStudent | null>(null);
  const unlinkedOnly = params.get("unlinked") === "1";

  if (students.isPending) return <PageSpinner />;
  if (students.error) return <Alert tone="danger">{students.error.message}</Alert>;

  const all = students.data;
  const words = query.trim().toLowerCase();
  const filtering = !!words || unlinkedOnly;
  const matches = all.filter((s) => (!words || s.fullName.toLowerCase().includes(words)) && (!unlinkedOnly || s.parentStatus !== "LINKED"));
  const armOrder = [...new Map(all.map((s) => [s.armId, s])).values()].sort((a, b) => a.classOrder - b.classOrder || a.armName.localeCompare(b.armName));
  const withoutParent = all.filter((s) => s.parentStatus !== "LINKED").length;
  const toggle = (armId: string) => setOpen((prev) => { const next = new Set(prev); if (next.has(armId)) next.delete(armId); else next.add(armId); return next; });

  const sections = SECTIONS.map((section) => {
    const groups = armOrder
      .filter((a) => (section.orders as readonly number[]).includes(a.classOrder))
      .map((a) => ({ armId: a.armId, armName: a.armName, classOrder: a.classOrder, list: matches.filter((s) => s.armId === a.armId) }))
      .filter((g) => g.list.length);
    return { section, groups, count: groups.reduce((n, g) => n + g.list.length, 0) };
  }).filter((s) => s.groups.length);

  return (
    <>
      <PageHeader title="Students">
        {all.length} students in {armOrder.length} classes. {withoutParent ? `${withoutParent} still need a parent linked before they can see results.` : "Every student has a parent linked."}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search students</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="min-h-[46px] w-full rounded-full border-0 bg-raise pl-11 pr-4 text-base shadow-raised focus:outline-none focus:ring-2 focus:ring-accent" />
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--color-accent)]" checked={unlinkedOnly} onChange={(e) => setParams(e.target.checked ? { unlinked: "1" } : {})} />
          No parent linked
        </label>
        {!filtering && (
          <button type="button" className="ml-auto text-[13.5px] font-medium text-accent hover:underline" onClick={() => setOpen(open.size ? new Set() : new Set(armOrder.map((a) => a.armId)))}>
            {open.size ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {sections.length ? (
        <div className="grid gap-6">
          {sections.map(({ section, groups, count }) => (
            <section key={section.id} className="grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3 px-1.5">
                <h2 className="text-[21px] font-medium tracking-[-0.025em]">{section.name}</h2>
                <span className="text-[13px] text-text-secondary">
                  {filtering ? `${plural(count, "match", "matches")} in ${plural(groups.length, "class", "classes")}` : `${count} students, ${plural(groups.length, "class", "classes")}`}
                </span>
              </div>
              {groups.map((group, i) => {
                const isOpen = filtering || open.has(group.armId);
                const noParent = group.list.filter((s) => s.parentStatus !== "LINKED").length;
                const level = levelStyle(group.classOrder);
                return (
                  <div key={group.armId} className={cx("animate-pop overflow-hidden rounded-[22px] bg-surface transition-shadow", isOpen ? "shadow-float" : "shadow-raised")} style={{ ...level, ["--d" as string]: `${i * 0.03}s` }}>
                    <button type="button" aria-expanded={isOpen} onClick={() => toggle(group.armId)} className="grid w-full grid-cols-[46px_minmax(0,1fr)_34px] items-center gap-3.5 px-4 py-3.5 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:grid-cols-[46px_minmax(0,1fr)_auto_34px]">
                      <span aria-hidden className="grid h-[46px] w-[46px] place-items-center rounded-[15px] text-sm font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                        {group.armName.replace(/^\s*(JSS|SS)\s*/i, "")}
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[15.5px] font-semibold">{group.armName}</b>
                        <span className="text-[13px] text-text-secondary">{plural(group.list.length, "student")}{noParent ? `, ${noParent} without a parent` : ""}</span>
                      </span>
                      <span aria-hidden className="hidden pl-2 sm:flex">
                        {group.list.slice(0, 4).map((s) => (
                          <i key={s.id} className="-ml-2 grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-semibold not-italic shadow-[0_0_0_2.5px_var(--color-surface)]" style={{ background: "var(--tint)", color: "var(--deep)" }}>{s.fullName[0]}</i>
                        ))}
                        {group.list.length > 4 && <i className="-ml-2 grid h-[30px] min-w-[30px] place-items-center rounded-full bg-sunken px-1 text-[10.5px] font-semibold not-italic text-text-secondary shadow-[0_0_0_2.5px_var(--color-surface)]">+{group.list.length - 4}</i>}
                      </span>
                      <span aria-hidden className={cx("grid h-[34px] w-[34px] place-items-center rounded-full transition-colors", isOpen ? "bg-primary text-primary-text" : "bg-sunken")}>
                        <Icon name="chevron" className={cx("h-4 w-4 transition-transform duration-300", isOpen && "rotate-90")} />
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="grid animate-pop gap-0.5 border-t border-divider p-2">
                        {group.list.map((s) => (
                          <li key={s.id} className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-2 hover:bg-hover sm:grid-cols-[2.4rem_minmax(0,1fr)_auto_auto]">
                            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                              {s.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                            </span>
                            <span className="min-w-0"><b className="block truncate font-medium">{s.fullName}</b><span className="text-[12.5px] text-text-secondary">{s.admissionNo}</span></span>
                            <span className="hidden sm:block"><ParentBadge status={s.parentStatus} /></span>
                            <span className="flex justify-end">
                              {s.parentStatus === "NONE" && (
                                <Button size="sm" variant="secondary" onClick={() => setInviting(s)}>
                                  <Icon name="mail" className="h-4 w-4" />
                                  Invite parent
                                </Button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No students match">{words ? `Nobody called “${query.trim()}”. Check the spelling.` : "Every student has a parent linked."}</EmptyState>
      )}

      <InviteParentDialog student={inviting} onClose={() => setInviting(null)} />
    </>
  );
}

function InviteParentDialog({ student, onClose }: { student: AdminStudent | null; onClose: () => void }) {
  if (!student) return null;
  return <InviteParentForm key={student.id} student={student} onClose={onClose} />;
}

function InviteParentForm({ student, onClose }: { student: AdminStudent; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const invite = useInviteParent();
  const first = student.fullName.split(" ")[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate({ studentId: student.id, fullName, email }, { onSuccess: () => { toast(`Invite sent to ${email.trim()}`); onClose(); } });
  };

  return (
    <Dialog open onClose={onClose} title={`Invite ${first}'s parent`} description={`They'll get a link to set a password and see ${first}'s results. It works for 72 hours.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <TextField label="Parent's name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={`e.g. Mrs Bola ${student.fullName.split(" ").slice(-1)[0]}`} data-autofocus error={fieldError(invite.error, "fullName")} />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" spellCheck={false} error={fieldError(invite.error, "email")} hint="No email? Print an access code from the student's record instead." />
        {generalError(invite.error) && <Alert tone="danger">{generalError(invite.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={invite.isPending}><Icon name="mail" className="h-4 w-4" />Send invite</Button>
        </div>
      </form>
    </Dialog>
  );
}
