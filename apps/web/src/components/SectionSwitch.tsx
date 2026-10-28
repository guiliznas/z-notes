import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";

type Section = "notes" | "tasks";

/** Alternância Notas | Tarefas no topo das barras laterais. */
export function SectionSwitch({ current }: { current: Section }) {
  const navigate = useNavigate();
  const go = (section: Section) => {
    if (section !== current) navigate(section === "notes" ? "/" : "/tasks");
  };
  const item = (section: Section, label: string) => (
    <button
      type="button"
      aria-pressed={current === section}
      onClick={() => go(section)}
      className={cn(
        "flex-1 rounded-[7px] py-1.5 text-[13px] transition",
        current === section
          ? "bg-[var(--panel)] font-semibold text-[var(--text)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Seção" className="flex rounded-[9px] bg-[var(--surface-hover)] p-[3px]">
      {item("notes", "Notas")}
      {item("tasks", "Tarefas")}
    </div>
  );
}
