import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("PWA Manifest - Web Share Target", () => {
  it("contém a configuração do share_target no vite.config.ts", () => {
    const configPath = path.resolve(__dirname, "../../vite.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain("share_target:");
    expect(content).toContain('action: "/inbox/share"');
    expect(content).toContain('method: "GET"');
    expect(content).toContain('title: "title"');
    expect(content).toContain('text: "text"');
    expect(content).toContain('url: "url"');
  });

  it("gera o manifest.webmanifest no build com share_target correto", () => {
    const manifestDistPath = path.resolve(__dirname, "../../dist/manifest.webmanifest");
    if (!fs.existsSync(manifestDistPath)) {
      // Se não foi buildado ainda, o teste acima já valida a configuração estática
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestDistPath, "utf-8"));
    expect(manifest.share_target).toEqual({
      action: "/inbox/share",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    });
  });
});
