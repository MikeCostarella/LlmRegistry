import { BUNDLED } from "../data/registry";

export default function About() {
  return (
    <div className="about">
      <h2>What this is</h2>
      <p>
        A registry of large language models — the hosted frontier models and the open-weight ones you can run yourself — kept as one JSON file, with
        <b> groups</b> defined as tag queries and <b>operations</b> you can fan out across any group and read side by side. It started as the answer to
        "what LLMs are out there now, and how do I keep track of them as the roster changes every month?"
      </p>

      <h2>How it is put together</h2>
      <ul>
        <li><b>registry/models.json</b> at the repo root is the source of truth: providers, models, groups, operations. Bundled into this app at build time (updated {BUNDLED.updated}).</li>
        <li>Anything you add or edit here lives in this browser's local storage, layered over the bundled file. <b>Settings → Export registry JSON</b> hands back a merged file to commit.</li>
        <li>Calls go straight from the browser to each provider over its OpenAI-compatible endpoint (or Anthropic's Messages API). Keys stay in your browser.</li>
        <li>The <b>llm-registry</b> server in <a href="https://github.com/MikeCostarella/FleetMcpServers" target="_blank" rel="noopener noreferrer">FleetMcpServers</a> reads the same file, so an AI assistant can list models, resolve a group and run an operation as tools.</li>
      </ul>

      <h2>Free ways to use it</h2>
      <ul>
        <li><b>Ollama</b> or <b>LM Studio</b> on your own machine — no key, no cost.</li>
        <li><b>OpenRouter</b>'s rotating free models (ids ending in <code>:free</code>), and its public catalog for real model ids and prices.</li>
        <li>Free tiers at <b>Google AI Studio</b> and <b>Groq</b>.</li>
      </ul>

      <h2>Roadmap</h2>
      <ul>
        <li>Operations with inputs, expected outputs and scorers — turning a run into a benchmark.</li>
        <li>Streaming results and per-model system-prompt overrides.</li>
        <li>Scheduled regression runs when a provider ships a point release.</li>
        <li>A fleet-wide "which model should this app call?" recommendation based on run history.</li>
      </ul>

      <p className="muted">Created by Mike Costarella · Costarella Innovations, LLC · <a href="https://github.com/MikeCostarella/LlmRegistry" target="_blank" rel="noopener noreferrer">Source on GitHub</a></p>
    </div>
  );
}
