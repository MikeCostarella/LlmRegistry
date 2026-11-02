import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Non-modal help pane sliding in at the right edge, as in the other fleet apps. */
export default function HelpPane({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside className={`help-pane${open ? " open" : ""}`} aria-hidden={!open} aria-label="Help">
      <div className="help-head">
        <h2>How this app works</h2>
        <button type="button" className="icon-btn" aria-label="Close help" onClick={onClose}>×</button>
      </div>
      <div className="help-body">
        <h3>Models</h3>
        <p>The registry: one row per model you might call, with the provider that serves it, the exact API <b>model id</b>, access (closed / open-weight), pricing per million tokens and free-form <b>tags</b>.</p>
        <p><b>Where edits go</b> depends on how the app is running — the stats strip says which. Under <code>npm run dev</code> on your own machine, edits are written straight to <code>registry/models.json</code> in the repo and show up as a git diff to commit. On the published site, edits stay in this browser until you export them from Settings and drop the file into the repo.</p>
        <p>A dashed <b>unverified</b> badge means the model id came from an announcement, not a provider catalog. The fastest way to fix those is <b>Settings → Import</b>, which pulls real ids, context sizes and prices from OpenRouter's public catalog or from the models pulled on your Ollama.</p>

        <h3>Groups</h3>
        <p>A group is a <b>tag query</b>, not a hand-kept list: "all open-weight", "anything ≤ $1 per million input tokens", "runs locally". When a new model is added with matching tags it lands in the right groups by itself. A filter's clauses AND together; values inside one clause OR.</p>

        <h3>Operations</h3>
        <p>An operation is a saved system prompt + prompt. Pick one, pick a group (or tick individual models), and <b>Run</b> fans it out in parallel. Each result card shows the answer, latency, tokens and estimated cost, so the same question across eight models reads side by side. Export a run as CSV from the Run view.</p>

        <h3>Keys and privacy</h3>
        <p>API keys are stored in this browser's local storage only and sent straight to the provider — nothing passes through a server of mine. Local models via Ollama / LM Studio need no key. Clear keys any time in Settings.</p>

        <h3>MCP server</h3>
        <p>The same <code>registry/models.json</code> is read by the <code>llm-registry</code> server in FleetMcpServers, so Claude Code or Claude Desktop can list models, resolve a group and run an operation as tools, with keys taken from environment variables.</p>

        <h3>Shortcuts</h3>
        <ul>
          <li><b>?</b> — toggle this help</li>
          <li><b>Esc</b> — close help or menu</li>
          <li><b>Ctrl+Enter</b> in the Run view — start the run</li>
        </ul>
      </div>
    </aside>
  );
}
