import { describe, expect, it } from "vitest";
import { resolveDictionaryLoadSource } from "../src/lib/dictionary-load-source";

describe("resolveDictionaryLoadSource", () => {
  it("prefers getDictionary when set", () => {
    expect(
      resolveDictionaryLoadSource({
        hasGetDictionary: true,
      })
    ).toBe("getDictionary");
  });

  it("defaults to packaged google when getDictionary absent", () => {
    expect(
      resolveDictionaryLoadSource({
        hasGetDictionary: false,
      })
    ).toBe("packagedGoogle");
  });
});
