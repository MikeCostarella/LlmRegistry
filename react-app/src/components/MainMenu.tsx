import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group } from "../data/types";

export type AppView = "models" | "groups" | "operations" | "run" | "history" | "settings" | "about";
export const VIEW_LABELS: Record<AppView, string> = {
  models: "Models",
  groups: "Groups",
  operations: "Operations",
  run: "Run",
  history: "Run history",
  settings: "Settings",
  about: "About this app",
};

const GITHUB_REPO_URL = "https://github.com/MikeCostarella/LlmRegistry";
const MY_WEBSITE_URL = "https://mikecostarella.github.io/MyWebSite/";
const FLEET_MCP_URL = "https://github.com/MikeCostarella/FleetMcpServers";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/models";
const OLLAMA_LIBRARY_URL = "https://ollama.com/library";

interface Props {
  view: AppView;
  onViewChange: (v: AppView) => void;
  groups: Group[];
  onRunGroup: (groupId: string) => void;
}

/**
 * The fleet's hamburger accordion menu: View, Groups (one-click "run on this
 * group"), Links. Opens on click; closes on outside click or Escape.
 */
export default function MainMenu({ view, onViewChange, groups, onRunGroup }: Props) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["Links"]));
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocMouseDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggleSection = (name: string) =>
    setCollapsed((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });

  const Section = ({ title, children }: { title: string; children: ReactNode }) => {
    const isOpen = !collapsed.has(title);
    return (
      <>
        <button type="button" className="menu-section-label menu-section-toggle" aria-expanded={isOpen} onClick={() => toggleSection(title)}>
          <span>{title}</span>
          <span className="menu-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
        </button>
        {isOpen && children}
      </>
    );
  };

  return (
    <div id="main-menu" ref={ref}>
      <button id="main-menu-btn" type="button" aria-label="Menu" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="menu-bars" aria-hidden="true"><span /><span /><span /></span>
      </button>
      {open && (
        <div id="main-menu-dropdown" role="menu">
          <Section title="View">
            {(Object.keys(VIEW_LABELS) as AppView[]).map((v) => (
              <button key={v} type="button" role="menuitemradio" aria-checked={view === v}
                className={`menu-item${view === v ? " active" : ""}`} onClick={() => { onViewChange(v); setOpen(false); }}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </Section>
          {groups.length > 0 && (
            <Section title="Run on group">
              {groups.map((g) => (
                <button key={g.id} type="button" className="menu-item" role="menuitem" onClick={() => { onRunGroup(g.id); setOpen(false); }}>
                  {g.name}
                </button>
              ))}
            </Section>
          )}
          <Section title="Links">
            <a className="menu-item menu-link" role="menuitem" href={OPENROUTER_MODELS_URL} target="_blank" rel="noopener noreferrer">OpenRouter model catalog ↗</a>
            <a className="menu-item menu-link" role="menuitem" href={OLLAMA_LIBRARY_URL} target="_blank" rel="noopener noreferrer">Ollama library ↗</a>
            <a className="menu-item menu-link" role="menuitem" href={FLEET_MCP_URL} target="_blank" rel="noopener noreferrer">FleetMcpServers (llm-registry) ↗</a>
            <a className="menu-item menu-link" role="menuitem" href={MY_WEBSITE_URL} target="_blank" rel="noopener noreferrer">All my projects ↗</a>
            <a className="menu-item menu-link" role="menuitem" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">Source on GitHub ↗</a>
          </Section>
        </div>
      )}
    </div>
  );
}
