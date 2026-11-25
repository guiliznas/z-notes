import { describe, it, expect } from "vitest";
import type { InboxItem } from "@z-notes/shared";
import {
  formatDaySeparator,
  formatMessageTime,
  parseLinksInText,
  buildInboxTimeline,
} from "./inbox";

function makeItem(id: number, content: string, capturedAt: number): InboxItem {
  return {
    id,
    clientId: `client-${id}`,
    content,
    source: "app",
    capturedAt,
    archived: false,
    archivedAt: null,
    resolvedKind: null,
    resolvedId: null,
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
}

describe("inbox helpers", () => {
  it("formatDaySeparator identifica Hoje, Ontem e datas completas", () => {
    const now = new Date(2026, 10, 17, 15, 30); // 17 de novembro de 2026
    const todayTs = new Date(2026, 10, 17, 9, 0).getTime();
    const yesterdayTs = new Date(2026, 10, 16, 20, 0).getTime();
    const olderThisYearTs = new Date(2026, 10, 10, 12, 0).getTime();
    const lastYearTs = new Date(2025, 4, 1, 10, 0).getTime();

    expect(formatDaySeparator(todayTs, now)).toBe("Hoje");
    expect(formatDaySeparator(yesterdayTs, now)).toBe("Ontem");
    expect(formatDaySeparator(olderThisYearTs, now)).toContain("10 de novembro");
    expect(formatDaySeparator(lastYearTs, now)).toContain("2025");
  });

  it("formatMessageTime formata hora e minuto", () => {
    const ts = new Date(2026, 10, 17, 14, 5).getTime();
    expect(formatMessageTime(ts)).toBe("14:05");
  });

  it("parseLinksInText divide texto puro e links válidos", () => {
    const text = "Acesse https://github.com para ver o código e http://localhost:3000!";
    const segments = parseLinksInText(text);

    expect(segments).toEqual([
      { type: "text", value: "Acesse " },
      { type: "link", value: "https://github.com" },
      { type: "text", value: " para ver o código e " },
      { type: "link", value: "http://localhost:3000!" },
    ]);
  });

  it("buildInboxTimeline adiciona separadores agrupando mensagens por dia", () => {
    const now = new Date(2026, 10, 17, 18, 0);
    const d1_1 = new Date(2026, 10, 16, 10, 0).getTime();
    const d1_2 = new Date(2026, 10, 16, 14, 0).getTime();
    const d2_1 = new Date(2026, 10, 17, 9, 0).getTime();

    const items = [
      makeItem(1, "msg ontem 1", d1_1),
      makeItem(2, "msg ontem 2", d1_2),
      makeItem(3, "msg hoje", d2_1),
    ];

    const timeline = buildInboxTimeline(items, now);

    expect(timeline).toHaveLength(5);
    expect(timeline[0]).toEqual({ type: "separator", id: "sep-2026-10-16", label: "Ontem" });
    expect(timeline[1]).toEqual({ type: "item", item: items[0] });
    expect(timeline[2]).toEqual({ type: "item", item: items[1] });
    expect(timeline[3]).toEqual({ type: "separator", id: "sep-2026-10-17", label: "Hoje" });
    expect(timeline[4]).toEqual({ type: "item", item: items[2] });
  });
});
