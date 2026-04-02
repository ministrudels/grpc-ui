import type { Theme } from "../../App";
import "./styles.css";

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

export default function Settings({ theme, onThemeChange, onClose }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="dialog-title">Settings</span>
          <button className="settings-close-btn" onClick={onClose}>✕</button>
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
      </div>
    </div>
  );
}
