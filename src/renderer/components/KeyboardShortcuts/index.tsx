import { SHORTCUTS, formatShortcutWithAlternate, isMacPlatform, type ShortcutSection } from "../../../shortcuts";
import "./styles.css";

interface Props {
  onClose: () => void;
}

const SECTIONS: ShortcutSection[] = ["Requests", "Navigation", "App", "Dialogs"];

export default function KeyboardShortcuts({ onClose }: Props) {
  const isMac = isMacPlatform(window.navigator.platform);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <div>
            <div className="dialog-title" id="shortcuts-title">Keyboard Shortcuts</div>
            <div className="dialog-subtitle">Use the menubar or these shortcuts to move quickly.</div>
          </div>
          <button className="shortcuts-close-btn" onClick={onClose} aria-label="Close keyboard shortcuts">x</button>
        </div>

        <div className="shortcuts-sections">
          {SECTIONS.map((section) => {
            const shortcuts = SHORTCUTS.filter((shortcut) => shortcut.section === section);
            return (
              <section className="shortcuts-section" key={section}>
                <h2 className="shortcuts-section-title">{section}</h2>
                <dl className="shortcuts-list">
                  {shortcuts.map((shortcut) => (
                    <div className="shortcuts-row" key={shortcut.id}>
                      <dt>{shortcut.action}</dt>
                      <dd>
                        {formatShortcutWithAlternate(shortcut, isMac).split(" or ").map((part, index) => (
                          <span key={part} className="shortcuts-key-group">
                            {index > 0 && <span className="shortcuts-or">or</span>}
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
  );
}
