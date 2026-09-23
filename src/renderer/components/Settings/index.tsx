import type { Theme } from "../../App";
import { SHORTCUTS, formatShortcutWithAlternate, isMacPlatform, type ShortcutSection } from "../../../shortcuts";
import "./styles.css";

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

const SECTIONS: ShortcutSection[] = ["Requests", "Navigation", "App", "Dialogs"];

export default function Settings({ theme, onThemeChange, onClose }: Props) {
  const isMac = isMacPlatform(window.navigator.platform);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <span className="dialog-title" id="settings-title">Settings</span>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">x</button>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">Appearance</div>
          <div className="settings-row">
            <span className="dialog-field-label">Theme</span>
            <div className="settings-theme-toggle">
              <button
                className={`settings-theme-btn${theme === "dark" ? " active" : ""}`}
                onClick={() => onThemeChange("dark")}
              >
                Dark
              </button>
              <button
                className={`settings-theme-btn${theme === "light" ? " active" : ""}`}
                onClick={() => onThemeChange("light")}
              >
                Light
              </button>
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">Keyboard Shortcuts</div>
          <div className="settings-shortcuts-sections">
            {SECTIONS.map((section) => {
              const shortcuts = SHORTCUTS.filter((shortcut) => shortcut.section === section);
              return (
                <section className="settings-shortcuts-section" key={section}>
                  <h2 className="settings-shortcuts-title">{section}</h2>
                  <dl className="settings-shortcuts-list">
                    {shortcuts.map((shortcut) => (
                      <div className="settings-shortcuts-row" key={shortcut.id}>
                        <dt>{shortcut.action}</dt>
                        <dd>
                          {formatShortcutWithAlternate(shortcut, isMac).split(" or ").map((part, index) => (
                            <span key={part} className="settings-shortcuts-key-group">
                              {index > 0 && <span className="settings-shortcuts-or">or</span>}
                              <kbd>{part}</kbd>
                            </span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
