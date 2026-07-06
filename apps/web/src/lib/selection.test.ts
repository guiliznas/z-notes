import { describe, it, expect } from "vitest";
import {
  parseSource,
  sourcePath,
  notePath,
  sourceViewFilter,
  sourceFolderId,
  sourceKey,
} from "./selection";

describe("parseSource", () => {
  it("reconhece cada tipo de origem pela URL", () => {
    expect(parseSource("/all")).toEqual({ kind: "all" });
    expect(parseSource("/")).toEqual({ kind: "all" });
    expect(parseSource("/archived")).toEqual({ kind: "archived" });
    expect(parseSource("/trash")).toEqual({ kind: "trash" });
    expect(parseSource("/folder/7", "7")).toEqual({ kind: "folder", folderId: 7 });
  });
});

describe("sourcePath / notePath", () => {
  it("gera caminhos consistentes", () => {
    expect(sourcePath({ kind: "all" })).toBe("/all");
    expect(sourcePath({ kind: "archived" })).toBe("/archived");
    expect(sourcePath({ kind: "folder", folderId: 3 })).toBe("/folder/3");
    expect(notePath({ kind: "folder", folderId: 3 }, 9)).toBe("/folder/3/note/9");
    expect(notePath({ kind: "all" }, 5)).toBe("/all/note/5");
  });
});

describe("mapeamentos de origem", () => {
  it("view filter", () => {
    expect(sourceViewFilter({ kind: "all" })).toBe("active");
    expect(sourceViewFilter({ kind: "folder", folderId: 1 })).toBe("active");
    expect(sourceViewFilter({ kind: "archived" })).toBe("archived");
    expect(sourceViewFilter({ kind: "trash" })).toBe("trash");
  });
  it("folderId só para pastas", () => {
    expect(sourceFolderId({ kind: "all" })).toBeNull();
    expect(sourceFolderId({ kind: "folder", folderId: 4 })).toBe(4);
  });
  it("chave de cache", () => {
    expect(sourceKey({ kind: "all" })).toBe("all");
    expect(sourceKey({ kind: "folder", folderId: 2 })).toBe("folder:2");
  });
});
