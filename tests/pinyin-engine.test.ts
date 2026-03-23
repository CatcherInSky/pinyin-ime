import { describe, it, expect } from "vitest";
import { createPinyinEngine } from "../src/engine/pinyin-engine";
import type { GooglePinyinDict } from "../dictionary/google_pinyin_dict";

const tinyDict: GooglePinyinDict = {
  n: [
    { w: "你", f: 10 },
    { w: "泥", f: 5 },
  ],
  ni: [{ w: "你", f: 10 }],
  nihao: [{ w: "你好", f: 8 }],
};

describe("createPinyinEngine", () => {
  it("returns candidates for prefix keys", () => {
    const engine = createPinyinEngine(tinyDict);
    const { candidates } = engine.getCandidates("n");
    const words = candidates.map((c) => c.word);
    expect(words).toContain("你");
    expect(words).toContain("泥");
  });

  it("computeMatchedLength prefers longest pinyin prefix", () => {
    const engine = createPinyinEngine(tinyDict);
    const len = engine.computeMatchedLength("你好", "nihao", 2);
    expect(len).toBe(5);
  });

  it("returns empty candidates for empty input", () => {
    const engine = createPinyinEngine(tinyDict);
    expect(engine.getCandidates("").candidates).toEqual([]);
  });
});
