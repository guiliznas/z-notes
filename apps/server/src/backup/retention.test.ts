import { describe, it, expect } from "vitest";
import { selectSnapshotsToDelete, type SnapshotMeta } from "./retention.js";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

// "agora" fixo e arbitrário — nunca usa Date.now(), garante determinismo.
const NOW = Date.UTC(2026, 6, 7); // 2026-07-07T00:00:00Z

function daysAgo(days: number): number {
  return NOW - days * DAY_MS;
}

describe("selectSnapshotsToDelete", () => {
  it("mantém todos os snapshots com menos de 7 dias", () => {
    const snaps: SnapshotMeta[] = [
      { filename: "d0", createdAt: daysAgo(0) },
      { filename: "d3", createdAt: daysAgo(3) },
      { filename: "d6", createdAt: daysAgo(6) },
    ];
    expect(selectSnapshotsToDelete(snaps, NOW)).toEqual([]);
  });

  it("na janela semanal (7d–63d), mantém só o mais recente por bucket de ~7 dias", () => {
    // Dois timestamps construídos a partir do MESMO múltiplo de WEEK_MS caem
    // necessariamente no mesmo bucket (floor(ts / WEEK_MS) idêntico).
    const bucketStart = Math.floor(daysAgo(20) / WEEK_MS) * WEEK_MS;
    const sameBucketOlder = bucketStart + 1 * DAY_MS;
    const sameBucketNewer = bucketStart + 2 * DAY_MS;
    const otherBucket = bucketStart - WEEK_MS + 2 * DAY_MS; // bucket anterior, garantidamente distinto

    const snaps: SnapshotMeta[] = [
      { filename: "same-older", createdAt: sameBucketOlder },
      { filename: "same-newer", createdAt: sameBucketNewer },
      { filename: "other-week", createdAt: otherBucket },
    ];
    const toDelete = selectSnapshotsToDelete(snaps, NOW).map((s) => s.filename);
    expect(toDelete).toEqual(["same-older"]);
  });

  it("além de 63 dias (7d + 8sem), mantém só o mais recente por mês-calendário", () => {
    const janOld = Date.UTC(2026, 0, 10); // mesmo mês que janNew
    const janNew = Date.UTC(2026, 0, 20);
    const decOther = Date.UTC(2025, 11, 5); // mês diferente

    const snaps: SnapshotMeta[] = [
      { filename: "jan-old", createdAt: janOld },
      { filename: "jan-new", createdAt: janNew },
      { filename: "dec-other", createdAt: decOther },
    ];
    const toDelete = selectSnapshotsToDelete(snaps, NOW).map((s) => s.filename);
    expect(toDelete).toEqual(["jan-old"]);
  });

  it("snapshot mensal nunca expira, mesmo com 1 ano de idade", () => {
    const ancient = Date.UTC(2020, 0, 15);
    const snaps: SnapshotMeta[] = [{ filename: "ancient", createdAt: ancient }];
    expect(selectSnapshotsToDelete(snaps, NOW)).toEqual([]);
  });

  it("cenário completo: diários + semanais + mensais coexistindo", () => {
    const weekBucketStart = Math.floor(daysAgo(20) / WEEK_MS) * WEEK_MS;

    const snaps: SnapshotMeta[] = [
      { filename: "today", createdAt: daysAgo(0) },
      { filename: "d6", createdAt: daysAgo(6) },
      { filename: "w-older", createdAt: weekBucketStart + 1 * DAY_MS },
      { filename: "w-newer", createdAt: weekBucketStart + 2 * DAY_MS },
      { filename: "jan-a", createdAt: Date.UTC(2026, 0, 10) },
      { filename: "jan-b", createdAt: Date.UTC(2026, 0, 20) },
    ];
    const toDelete = selectSnapshotsToDelete(snaps, NOW).map((s) => s.filename);

    expect(toDelete).not.toContain("today");
    expect(toDelete).not.toContain("d6");
    expect(toDelete).not.toContain("w-newer");
    expect(toDelete).not.toContain("jan-b");
    expect(toDelete).toContain("w-older");
    expect(toDelete).toContain("jan-a");
    expect(toDelete).toHaveLength(2);
  });
});
