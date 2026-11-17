import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useInboxCount } from "@/hooks/useInbox";

export type Section = "notes" | "tasks" | "inbox";

/** Alternância Notas | Tarefas | Inbox no topo das barras laterais. */
export function SectionSwitch({ current }: { current: Section }) {
  const navigate = useNavigate();
  const { data: inboxCount } = useInboxCount();
  const pendingCount = inboxCount?.count ?? 0;

  const go = (section: Section) => {
    if (section !== current) {
      if (section === "notes") navigate("/");
      else if (section === "tasks") navigate("/tasks");
      else navigate("/inbox");
    }
  };

  const item = (section: Section, label: string, badge?: number) => (
    <button
      type="button"
      aria-pressed={current === section}
      aria-label={badge && badge > 0 ? `${label}, ${badge} pendente${badge > 1 ? "s" : ""}` : label}
      onClick={() => go(section)}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-[7px] py-1.5 text-[13px] transition",
        current === section
          ? "bg-[var(--panel)] font-semibold text-[var(--text)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      <span>{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span
          className={cn(
            "inline-flex min-w-4 items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold",
            current === section
              ? "bg-[var(--accent)] text-black"
              : "bg-[var(--surface-2)] text-[var(--muted)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div role="group" aria-label="Seção" className="flex rounded-[9px] bg-[var(--surface-hover)] p-[3px]">
      {item("notes", "Notas")}
      {item("tasks", "Tarefas")}
      {item("inbox", "Inbox", pendingCount)}
    </div>
  );
}
