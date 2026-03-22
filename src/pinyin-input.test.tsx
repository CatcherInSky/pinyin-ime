/**
 * @file pinyin-input.test.tsx
 * @description 受控输入 + 小词典下的键盘与选词烟测。
 */
import { describe, it, expect } from "vitest";
import * as React from "react";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GooglePinyinDict } from "./google_pinyin_dict";
import { PinyinInput } from "./pinyin-input";

const tinyDict: GooglePinyinDict = {
  n: [{ w: "你", f: 10 }],
};

function Harness() {
  const [value, setValue] = useState("");
  return (
    <>
      <PinyinInput value={value} onChange={setValue} dictionary={tinyDict} />
      <span data-testid="out">{value}</span>
    </>
  );
}

describe("PinyinInput", () => {
  it("shows candidate and commits selection with custom dictionary", async () => {
    render(<Harness />);
    const input = screen.getByRole("textbox");

    input.focus();
    fireEvent.keyDown(input, { key: "n", code: "KeyN" });

    expect(await screen.findByText("你")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "1", code: "Digit1" });

    expect(screen.getByTestId("out").textContent).toContain("你");
  });
});
