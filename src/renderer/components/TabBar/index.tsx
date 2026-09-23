import type { Tab, TabStatus } from "../../App";
import { formatShortcut, shortcutById } from "../../../shortcuts";
import "./styles.css";

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  isMac: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

function StatusDot({ status }: { status: TabStatus }) {
  if (status === "idle") return null;
  return <span className={`tabbar-status tabbar-status-${status}`} />;
}

export default function TabBar({ tabs, activeTabId, isMac, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;
  const closeShortcut = formatShortcut(shortcutById("closeTab"), isMac);
  const nextShortcut = formatShortcut(shortcutById("nextTab"), isMac);

  return (
    <div className="tabbar" title={`Switch tabs with ${nextShortcut}`}>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tabbar-tab${tab.id === activeTabId ? " active" : ""}`}
          onClick={() => onSelect(tab.id)}
          title={`Open tab ${index + 1}`}
        >
          <StatusDot status={tab.status} />
          <span className="tabbar-tab-name">{tab.method.name}</span>
          <button
            className="tabbar-tab-close"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            title={`Close tab (${closeShortcut})`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
