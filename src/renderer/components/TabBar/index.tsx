import type { Tab } from "../../App";
import "./styles.css";

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="tabbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tabbar-tab${tab.id === activeTabId ? " active" : ""}`}
          onClick={() => onSelect(tab.id)}
        >
          <span className="tabbar-tab-name">{tab.method.name}</span>
          <button
            className="tabbar-tab-close"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            title="Close tab"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
