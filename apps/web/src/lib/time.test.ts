import { describe, it, expect } from "vitest";
import { relativeTime } from "./time";

const now = new Date("2026-07-06T15:00:00");

describe("relativeTime", () => {
  it("mostra hora no mesmo dia", () => {
    const ts = new Date("2026-07-06T09:30:00").getTime();
    expect(relativeTime(ts, now)).toMatch(/09:30/);
  });

  it("mostra 'Ontem' para o dia anterior", () => {
    const ts = new Date("2026-07-05T22:00:00").getTime();
    expect(relativeTime(ts, now)).toBe("Ontem");
  });

  it("mostra dia da semana capitalizado na última semana", () => {
    const ts = new Date("2026-07-03T10:00:00").getTime();
    const out = relativeTime(ts, now);
    expect(out).not.toBe("Ontem");
    expect(out[0]).toBe(out[0].toUpperCase());
  });

  it("mostra data curta para datas antigas", () => {
    const ts = new Date("2026-06-20T10:00:00").getTime();
    expect(relativeTime(ts, now)).toMatch(/\d{2}\/\d{2}\/\d{2}/);
  });
});
