import { useQuery } from "@tanstack/react-query";
import type { MetricSample } from "@z-notes/shared";
import { fetchAdminMetrics } from "@/api/resources";

const CARDS: { key: string; label: string }[] = [
  { key: "users_total", label: "Usuários" },
  { key: "notes_total", label: "Notas (total)" },
  { key: "notes_active", label: "Notas ativas" },
  { key: "notes_archived", label: "Arquivadas" },
  { key: "notes_trash", label: "Lixeira" },
  { key: "folders_total", label: "Pastas" },
];

function lastValue(series: MetricSample[] | undefined): number {
  return series?.length ? series[series.length - 1].v : 0;
}

function Sparkline({ series }: { series: MetricSample[] }) {
  const w = 220;
  const h = 48;
  if (series.length < 2) {
    return <div className="flex h-12 items-center text-xs text-[var(--muted)]">sem histórico ainda</div>;
  }
  const max = Math.max(...series.map((p) => p.v), 1);
  const step = w / (series.length - 1);
  const points = series.map((p, i) => `${(i * step).toFixed(1)},${(h - 4 - (p.v / max) * (h - 10)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="text-[var(--accent)]" role="img" aria-label="evolução">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminPage() {
  const metrics = useQuery({ queryKey: ["admin-metrics"], queryFn: fetchAdminMetrics, retry: 1 });

  if (metrics.isPending) {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando métricas…</div>;
  }
  if (metrics.isError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--danger)]">
        Sem acesso às métricas.
      </div>
    );
  }

  const series = metrics.data.series;
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-1 text-lg font-semibold">Administração</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">Evolução de usuários e notas (amostras a cada 6h).</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <section
            key={card.key}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            aria-label={card.label}
          >
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-sm text-[var(--muted)]">{card.label}</h2>
              <span className="text-2xl font-semibold">{lastValue(series[card.key])}</span>
            </div>
            <Sparkline series={series[card.key] ?? []} />
          </section>
        ))}
      </div>
    </div>
  );
}
