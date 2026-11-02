import { useCallback, useEffect, useState } from "react";
import BuildStamp from "./components/BuildStamp";
import HelpPane from "./components/HelpPane";
import MainMenu, { VIEW_LABELS, type AppView } from "./components/MainMenu";
import ModelsView from "./components/ModelsView";
import GroupsView from "./components/GroupsView";
import OperationsView from "./components/OperationsView";
import RunView, { type RunTarget } from "./components/RunView";
import HistoryView from "./components/HistoryView";
import SettingsView from "./components/SettingsView";
import About from "./components/About";
import type { Run, Settings } from "./data/types";
import { BUNDLED } from "./data/registry";
import { TIP } from "./data/glossary";
import { useRegistryStore } from "./data/store";
import { KEYS, readJson, writeJson } from "./data/storage";
import { loadRuns } from "./data/runner";

/**
 * Routes live in the hash so links can deep-link into a view:
 *   #/models  #/groups  #/operations  #/run  #/history  #/settings  #/about
 *   #/run/group/<groupId>        run view with that group targeted
 *   #/run/op/<operationId>       run view with that operation loaded
 */
function parseHash(): { view: AppView; target: RunTarget | null; opId: string | null } {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const view = (parts[0] as AppView) in VIEW_LABELS ? (parts[0] as AppView) : "models";
  let target: RunTarget | null = null;
  let opId: string | null = null;
  if (view === "run") {
    if (parts[1] === "group" && parts[2]) target = { kind: "group", groupId: parts[2] };
    if (parts[1] === "models" && parts[2]) target = { kind: "models", modelIds: parts[2].split(",") };
    if (parts[1] === "op" && parts[2]) opId = parts[2];
  }
  return { view, target, opId };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const store = useRegistryStore();
  const [settings, setSettings] = useState<Settings>(() => readJson<Settings>(KEYS.settings, {}));
  const [runs, setRuns] = useState<Run[]>(loadRuns);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key === "?") setHelpOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (view: AppView, suffix = "") => { location.hash = `#/${view}${suffix}`; };
  const changeSettings = useCallback((s: Settings) => { setSettings(s); writeJson(KEYS.settings, s); }, []);
  const importModels = useCallback((list: Parameters<typeof store.importModels>[0]) => { store.importModels(list); go("models"); }, [store]);

  useEffect(() => { document.title = route.view === "models" ? "LLM Registry" : `${VIEW_LABELS[route.view]} — LLM Registry`; }, [route.view]);

  const { models, groups, operations, mode, file, localEdits, lastError } = store;
  const fileMode = mode === "file";
  const providers = BUNDLED.providers;
  const keyed = providers.filter((p) => !p.keyEnv || settings[p.id]?.apiKey).length;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-left">
          <MainMenu view={route.view} onViewChange={(v) => go(v)} groups={groups} onRunGroup={(id) => go("run", `/group/${encodeURIComponent(id)}`)} />
          <div>
            <h1>LLM Registry <span className="state">{VIEW_LABELS[route.view]}</span></h1>
            <div className="sub">Every model worth calling, grouped by tag, with operations you can fan out across them</div>
          </div>
        </div>
        <div className="masthead-right">
          <div className="credit">Created by: Mike Costarella</div>
          <button type="button" className="icon-btn" aria-label="Help" title="Help (?)" onClick={() => setHelpOpen((o) => !o)}>?</button>
        </div>
      </header>

      <div className="stats">
        <span title={TIP.statModels}><b>{models.length}</b> models</span>
        <span title={TIP.statOpenWeight}><b>{models.filter((m) => m.access !== "closed").length}</b> open-weight</span>
        <span title={TIP.statGroups}><b>{groups.length}</b> groups</span>
        <span title={TIP.statOperations}><b>{operations.length}</b> operations</span>
        <span title={TIP.statProviders}><b>{keyed}</b> / {providers.length} providers ready</span>
        <span title={TIP.statRuns}><b>{runs.length}</b> runs saved</span>
        <span className="right" title={fileMode ? `${TIP.modeFile}${file ? `\n\n${file}` : ""}` : mode === "browser" ? TIP.modeBrowser : undefined}>
          {mode === "probing" && "…"}
          {fileMode && <><span className="dot ok" aria-hidden="true" /> edits write to <b>registry/models.json</b></>}
          {mode === "browser" && (localEdits > 0 ? `${localEdits} local edit${localEdits === 1 ? "" : "s"} in this browser` : "edits stay in this browser")}
        </span>
      </div>

      <main className="body">
        {lastError && (
          <div className="banner" style={{ borderColor: "var(--err)", background: "rgba(240,112,112,0.1)", whiteSpace: "pre-wrap" }}>
            <b>Not saved.</b> {lastError}{" "}
            <button type="button" className="btn small secondary" onClick={store.clearError}>dismiss</button>
          </div>
        )}
        {route.view === "models" && <ModelsView models={models} providers={providers} groups={groups} fileMode={fileMode} onSave={store.saveModel} onRemove={store.removeModel} onRunModels={(ids) => go("run", `/models/${ids.map(encodeURIComponent).join(",")}`)} />}
        {route.view === "groups" && <GroupsView models={models} providers={providers} groups={groups} fileMode={fileMode} onSave={store.saveGroup} onRemove={store.removeGroup} onRun={(id) => go("run", `/group/${encodeURIComponent(id)}`)} />}
        {route.view === "operations" && <OperationsView operations={operations} fileMode={fileMode} onSave={store.saveOperation} onRemove={store.removeOperation} onRun={(id) => go("run", `/op/${encodeURIComponent(id)}`)} />}
        {route.view === "run" && <RunView models={models} providers={providers} groups={groups} operations={operations} settings={settings} initialTarget={route.target} initialOperationId={route.opId} onRunSaved={setRuns} onGoSettings={() => go("settings")} />}
        {route.view === "history" && <HistoryView runs={runs} models={models} onRunsChanged={setRuns} />}
        {route.view === "settings" && <SettingsView providers={providers} settings={settings} onSettingsChange={changeSettings} models={models} groups={groups} operations={operations} fileMode={fileMode} registryFile={file} onImportModels={importModels} onResetLocal={store.resetLocal} />}
        {route.view === "about" && <About />}
      </main>

      <HelpPane open={helpOpen} onClose={() => setHelpOpen(false)} />
      <BuildStamp />
    </div>
  );
}
