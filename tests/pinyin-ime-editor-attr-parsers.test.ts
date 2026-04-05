import { describe, it, expect } from "vitest";
import type { PopupPlacement } from "../src/lib/types";
import {
  parseEditorTypeFromAttribute,
  parseEnabledFromAttribute,
  parsePageSizeFromAttribute,
  parsePopupPlacementFromAttribute,
  popupPlacementToAttribute,
} from "../src/lib/pinyin-ime-editor-attr-parsers";

describe("parseEnabledFromAttribute", () => {
  it("treats false-like tokens as disabled (case-insensitive, trimmed)", () => {
    expect(parseEnabledFromAttribute("false")).toBe(false);
    expect(parseEnabledFromAttribute("FALSE")).toBe(false);
    expect(parseEnabledFromAttribute("  off  ")).toBe(false);
    expect(parseEnabledFromAttribute("0")).toBe(false);
    expect(parseEnabledFromAttribute("no")).toBe(false);
    expect(parseEnabledFromAttribute("disabled")).toBe(false);
  });

  it("treats empty string and boolean-ish true tokens as enabled", () => {
    expect(parseEnabledFromAttribute("")).toBe(true);
    expect(parseEnabledFromAttribute("true")).toBe(true);
    expect(parseEnabledFromAttribute("1")).toBe(true);
    expect(parseEnabledFromAttribute("on")).toBe(true);
    expect(parseEnabledFromAttribute("yes")).toBe(true);
  });

  it("null means enabled (match default when attr absent)", () => {
    expect(parseEnabledFromAttribute(null)).toBe(true);
  });

  it("unknown non-empty strings default to enabled", () => {
    expect(parseEnabledFromAttribute("maybe")).toBe(true);
  });
});

describe("parsePopupPlacementFromAttribute", () => {
  it("accepts four placements", () => {
    expect(parsePopupPlacementFromAttribute("bottom")).toBe("bottom");
    expect(parsePopupPlacementFromAttribute(" TOP ")).toBe("top");
  });

  it("falls back to top", () => {
    expect(parsePopupPlacementFromAttribute("nope")).toBe("top");
    expect(parsePopupPlacementFromAttribute(null)).toBe("top");
  });
});

describe("popupPlacementToAttribute", () => {
  it("serializes valid placements", () => {
    expect(popupPlacementToAttribute("left")).toBe("left");
  });

  it("falls back for invalid values", () => {
    expect(popupPlacementToAttribute("invalid" as PopupPlacement)).toBe("top");
  });
});

describe("parseEditorTypeFromAttribute", () => {
  it("only textarea is textarea", () => {
    expect(parseEditorTypeFromAttribute("textarea")).toBe("textarea");
    expect(parseEditorTypeFromAttribute("TextArea")).toBe("textarea");
    expect(parseEditorTypeFromAttribute("input")).toBe("input");
    expect(parseEditorTypeFromAttribute("")).toBe("input");
    expect(parseEditorTypeFromAttribute(null)).toBe("input");
  });
});

describe("parsePageSizeFromAttribute", () => {
  it("parses integers and clamps", () => {
    expect(parsePageSizeFromAttribute("3")).toBe(3);
    expect(parsePageSizeFromAttribute("0")).toBe(1);
    expect(parsePageSizeFromAttribute("99")).toBe(9);
  });

  it("invalid uses default range", () => {
    expect(parsePageSizeFromAttribute("abc")).toBe(5);
    expect(parsePageSizeFromAttribute(null)).toBe(5);
  });
});

