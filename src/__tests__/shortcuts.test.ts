import { describe, expect, it } from "vitest";
import { formatShortcut, formatShortcutWithAlternate, shortcutById } from "../shortcuts";

describe("formatShortcut", () => {
  it("renders Cmd and Enter as symbols on Mac", () => {
    expect(formatShortcut(shortcutById("sendRequest"), true)).toBe("⌘+↩");
  });

  it("keeps Ctrl and Enter labels on non-Mac platforms", () => {
    expect(formatShortcut(shortcutById("sendRequest"), false)).toBe("Ctrl+Enter");
  });
});

describe("formatShortcutWithAlternate", () => {
  it("renders Mac alternates with the command symbol", () => {
    expect(formatShortcutWithAlternate(shortcutById("searchMethods"), true)).toBe("⌘+K or /");
  });
});
