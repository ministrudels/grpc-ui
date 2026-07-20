export type ShortcutId =
  | "sendRequest"
  | "cancelRequest"
  | "searchMethods"
  | "openSettings"
  | "openShortcuts"
  | "closeTab"
  | "nextTab"
  | "previousTab"
  | "jumpToTab"
  | "submitDialog"
  | "closeDialog";

export type ShortcutSection = "Requests" | "Navigation" | "App" | "Dialogs";

export type ShortcutDefinition = {
  id: ShortcutId;
  section: ShortcutSection;
  action: string;
  mac: string;
  other: string;
  alternateMac?: string;
  alternateOther?: string;
};

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "sendRequest",
    section: "Requests",
    action: "Send request",
    mac: "Cmd+Enter",
    other: "Ctrl+Enter"
  },
  {
    id: "cancelRequest",
    section: "Requests",
    action: "Cancel request",
    mac: "Esc",
    other: "Esc"
  },
  {
    id: "searchMethods",
    section: "Navigation",
    action: "Search methods",
    mac: "Cmd+K",
    other: "Ctrl+K",
    alternateMac: "/",
    alternateOther: "/"
  },
  {
    id: "nextTab",
    section: "Navigation",
    action: "Next tab",
    mac: "Ctrl+Tab",
    other: "Ctrl+Tab"
  },
  {
    id: "previousTab",
    section: "Navigation",
    action: "Previous tab",
    mac: "Ctrl+Shift+Tab",
    other: "Ctrl+Shift+Tab"
  },
  {
    id: "jumpToTab",
    section: "Navigation",
    action: "Jump to tab",
    mac: "Cmd+1-9",
    other: "Ctrl+1-9"
  },
  {
    id: "closeTab",
    section: "Navigation",
    action: "Close current tab",
    mac: "Cmd+W",
    other: "Ctrl+W"
  },
  {
    id: "openSettings",
    section: "App",
    action: "Open settings",
    mac: "Cmd+,",
    other: "Ctrl+,"
  },
  {
    id: "openShortcuts",
    section: "App",
    action: "Show keyboard shortcuts",
    mac: "Cmd+/",
    other: "Ctrl+/"
  },
  {
    id: "submitDialog",
    section: "Dialogs",
    action: "Submit dialog",
    mac: "Enter",
    other: "Enter"
  },
  {
    id: "closeDialog",
    section: "Dialogs",
    action: "Close dialog",
    mac: "Esc",
    other: "Esc"
  }
];

export function shortcutById(id: ShortcutId): ShortcutDefinition {
  const shortcut = SHORTCUTS.find((item) => item.id === id);
  if (!shortcut) throw new Error(`Unknown shortcut: ${id}`);
  return shortcut;
}

export function formatShortcut(shortcut: ShortcutDefinition, isMac: boolean): string {
  return isMac
    ? shortcut.mac
        .replace(/\bCmd\b/g, "⌘")
        .replace(/\bEnter\b/g, "↩")
    : shortcut.other;
}

export function formatShortcutWithAlternate(shortcut: ShortcutDefinition, isMac: boolean): string {
  const primary = formatShortcut(shortcut, isMac);
  const alternate = isMac ? shortcut.alternateMac : shortcut.alternateOther;
  return alternate ? `${primary} or ${alternate}` : primary;
}

export function isMacPlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}
