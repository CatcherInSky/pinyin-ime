import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadGooglePinyinDictFromUrl,
  assertGooglePinyinDictShape,
  DictionaryLoadError,
} from "./load-dictionary";

describe("assertGooglePinyinDictShape", () => {
  it("accepts a valid minimal dict", () => {
    const d = { a: [{ w: "啊", f: 1 }] };
    expect(assertGooglePinyinDictShape(d)).toEqual(d);
  });

  it("throws DictionaryLoadError on invalid shape", () => {
    expect(() => assertGooglePinyinDictShape(null)).toThrow(DictionaryLoadError);
    expect(() => assertGooglePinyinDictShape({ a: "x" })).toThrow(
      DictionaryLoadError
    );
  });
});

describe("loadGooglePinyinDictFromUrl", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws DictionaryLoadError when HTTP fails", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(null, { status: 404 })
    ) as typeof fetch;
    await expect(
      loadGooglePinyinDictFromUrl("https://example.com/dict.json")
    ).rejects.toThrow(DictionaryLoadError);
  });

  it("parses JSON body on success", async () => {
    const body = { x: [{ w: "测", f: 1 }] };
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    ) as typeof fetch;
    await expect(
      loadGooglePinyinDictFromUrl("https://example.com/ok.json")
    ).resolves.toEqual(body);
  });
});
