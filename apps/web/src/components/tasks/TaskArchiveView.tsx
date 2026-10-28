import { useNavigate } from "react-router-dom";
import { TASKS_ROOT } from "@/hooks/useTaskSelection";
import { useTaskArchive, useUpdateTask, useUpdateTaskFolder, useUpdateTaskList } from "@/hooks/useTasks";
import { useToast } from "../ui/Toast";
import { IconButton } from "../ui/IconButton";
import { ChevronLeftIcon } from "../icons";

interface Props {
  onBack?: () => void;
}

export function TaskArchiveView({ onBack }: Props) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const archive = useTaskArchive();
  const updateFolder = useUpdateTaskFolder();
  const updateList = useUpdateTaskList();
  const updateTask = useUpdateTask();
  const failed = () => notify("Não foi possível restaurar.", "error");

  const data = archive.data;
  const empty = data && data.folders.length + data.lists.length + data.tasks.length === 0;

  return (
    <div className="flex h-full flex-col bg-[var(--panel)]">
      <header className="flex items-center gap-1 px-2 py-4 md:px-7">
        {onBack && (
          <IconButton label="Voltar" onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <div className="px-2">
          <h1 className="text-[22px] font-bold tracking-tight">Arquivadas</h1>
          <p className="text-[13px] text-[var(--muted)]">Restaurar devolve o item ao quadro.</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-8 md:px-7">
        {!data && <p className="text-sm text-[var(--muted)]">Carregando…</p>}
        {empty && <p className="py-10 text-center text-sm text-[var(--muted)]">Nada arquivado.</p>}

        {data && data.folders.length > 0 && (
          <Section title="Pastas">
            {data.folders.map((f) => (
              <Item
                key={f.id}
                origin={`${f.listCount} lista(s)`}
                label={f.name}
                onRestore={() =>
                  updateFolder.mutate(
                    { id: f.id, input: { archived: false } },
                    { onSuccess: () => navigate(`${TASKS_ROOT}/folder/${f.id}`), onError: failed },
                  )
                }
              />
            ))}
          </Section>
        )}

        {data && data.lists.length > 0 && (
          <Section title="Listas">
            {data.lists.map((l) => (
              <Item
                key={l.id}
                origin={`${l.folderName} · ${l.taskCount} tarefa(s)`}
                label={l.name}
                onRestore={() => updateList.mutate({ id: l.id, input: { archived: false } }, { onError: failed })}
              />
            ))}
          </Section>
        )}

        {data && data.tasks.length > 0 && (
          <Section title="Tarefas">
            {data.tasks.map((t) => (
              <Item
                key={t.id}
                origin={`${t.folderName} › ${t.listName}`}
                label={t.title}
                onRestore={() => updateTask.mutate({ id: t.id, archived: false }, { onError: failed })}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</h2>
      <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">{children}</ul>
    </section>
  );
}

function Item({ label, origin, onRestore }: { label: string; origin: string; onRestore: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-[var(--muted)]">{label}</div>
        <div className="truncate text-xs text-[var(--muted)]">{origin}</div>
      </div>
      <button
        type="button"
        onClick={onRestore}
        aria-label={`Restaurar ${label}`}
        className="shrink-0 rounded px-1 py-0.5 text-[13px] font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-4"
      >
        Restaurar
      </button>
    </li>
  );
}
