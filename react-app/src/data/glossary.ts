/**
 * One place for the plain-English explanations used as hover text (title=)
 * across the app and as the glossary in the help pane, so they never drift.
 */

export const TIP = {
  // Stats strip
  statModels: "Every model in the registry, bundled plus any you added.",
  statOpenWeight: "Models whose trained weights can be downloaded and run on your own hardware (open-weight or open-source), as opposed to closed models reachable only through a vendor API.",
  statGroups: "Saved tag queries. A model belongs to a group whenever it matches the group's filter — nothing is hand-listed.",
  statOperations: "Saved prompts (optionally with a system prompt) that can be run across any set of models.",
  statProviders: "Providers that can be called right now: either they need no API key (local Ollama / LM Studio) or a key is set in Settings.",
  statRuns: "Past runs kept in this browser (last 30).",
  modeFile: "Dev server mode: edits are validated and written straight to registry/models.json in the repo. Commit them with git.",
  modeBrowser: "Published-site mode: edits are layered over the bundled registry in this browser's local storage. Settings → Export registry JSON to get them into the repo.",

  // Model fields / columns
  name: "Display name. Free text; the API never sees it.",
  vendor: "The lab that trained the model (Anthropic, Meta, DeepSeek…). Not necessarily who serves it — Llama is Meta's but you may call it through Ollama or OpenRouter.",
  provider: "The service the app actually sends the request to: a vendor's own API, a gateway such as OpenRouter, or a local server such as Ollama. Decides the base URL, the wire format and which API key is used.",
  modelId: "The exact model string put in the API request (e.g. claude-haiku-5-5, llama4:scout, openai/gpt-6-astra). Must match the provider's catalog character for character.",
  registryId: "This app's own stable key for the model, vendor-slug/model-slug. Used in group filters, run history and MCP tool calls. Never sent to a provider.",
  verified: "Ticked = the model id was confirmed against the provider's catalog (or imported from one). Unticked = taken from an announcement; calls may 404 until it is checked.",
  access: "closed: weights are private, API only. open-weight: weights downloadable, but training data or licence has strings attached. open-source: weights and an OSI licence.",
  status: "current: in production use. preview: early access or gated. deprecated: still callable but being retired. local: a model pulled onto this machine.",
  license: "The licence the weights (or API terms) are offered under — Proprietary, MIT, Apache-2.0, Llama Community…",
  released: "When the vendor shipped it (year-month is enough).",
  contextWindow: "How much the model can read and write in one call, in tokens (roughly ¾ of a word each). 200K ≈ a 500-page book; 1M ≈ five of them.",
  priceIn: "USD charged per million input (prompt) tokens — what you send. Blank = unknown; 0 = free.",
  priceOut: "USD charged per million output (completion) tokens — what the model writes back. Usually 3–5× the input price.",
  pricePair: "USD per million tokens: input / output. Blank = unknown pricing, so cost estimates show —. free = local or a free tier.",
  capabilities: "tools: can call functions (needed for agents). vision: accepts images. json: can be forced to emit structured JSON. reasoning: has an extended-thinking mode. audio: speech in/out. embeddings: produces vectors, not text.",
  tags: "Free-form labels, lower-case, space or comma separated. Groups are built from these, so consistent tagging is what makes groups work (frontier, cheap, coding, local, agentic…).",
  homepage: "Vendor or model page, for reference.",
  notes: "Anything worth remembering: quirks, pricing cliffs, why it is in the registry.",

  // Badges
  badgeClosed: "Closed: the weights are private; it is reachable only through the vendor's API.",
  badgeOpenWeight: "Open-weight: the weights can be downloaded and self-hosted. Check the licence for commercial terms.",
  badgeOpenSource: "Open-source: weights plus an OSI-approved licence.",
  badgePreview: "Preview: early-access or gated; expect changes and limits.",
  badgeDeprecated: "Deprecated: still callable for now, but being retired.",
  badgeLocal: "Local: pulled onto this machine (Ollama / LM Studio); free and offline.",
  badgeUnverified: "Model id came from an announcement, not a provider catalog. Settings → Import from OpenRouter / Ollama replaces it with a verified id.",
  badgeLocalEdit: "Added or edited in this browser only; export from Settings to get it into the repo.",
  tagChip: "A tag. In the Models view, click to filter; in a group, the filter matches on these.",

  // Groups
  groupRule: "All the clauses you fill in must hold at once (AND); inside one clause, any listed value is enough (OR).",
  allTags: "Every tag listed here must be on the model.",
  anyTags: "At least one of these tags must be on the model.",
  noneTags: "A model carrying any of these tags is excluded.",
  maxInputPrice: "Keep models priced at or below this many USD per million input tokens. Models with unknown pricing are left out, so set prices first if a model is missing.",
  minContext: "Keep models whose context window is at least this many tokens.",
  groupProviders: "Keep only models served by these providers.",
  groupVendors: "Keep only models trained by these labs.",
  groupAccess: "Keep only these access levels.",
  groupStatus: "Keep only these statuses.",
  groupCapabilities: "The model must have every capability ticked here.",

  // Run
  operation: "A saved system prompt + prompt. Pick one, then edit the text freely — the run records whether you changed it.",
  systemPrompt: "Instructions the model treats as standing orders (role, tone, format). Sent separately from the prompt; some local models ignore it.",
  prompt: "The user message every target model receives, word for word.",
  maxTokens: "Upper bound on how much the model may write back, in tokens. Caps cost and latency; too low truncates the answer mid-sentence.",
  temperature: "Randomness, 0–2. 0 = most deterministic (good for comparisons), ~1 = the provider's default, higher = more varied. Blank uses the provider default.",
  target: "Which models receive the prompt: a group (resolved at run time) or models ticked by hand.",
  latency: "Wall-clock time from sending the request to receiving the full answer.",
  tokensInOut: "Tokens the provider counted: what you sent (system + prompt) and what the model wrote back. Reported by the provider, not estimated.",
  estCost: "input tokens × input price + output tokens × output price, from the registry's pricing. — means the model has no pricing on file or the provider returned no usage.",
  runStatus: "grey: waiting. amber: calling. green: answered. red: failed (the message says why).",

  // Settings
  apiKey: "Your secret for this provider. Kept in this browser's local storage only and sent straight to the provider over HTTPS. Clear the field to forget it.",
  keyEnv: "The MCP server (FleetMcpServers / llm-registry) reads the same key from this environment variable instead.",
  baseUrl: "Where requests go. Leave blank for the provider's default; set it to reach Ollama on another machine (http://lvp-02:11434/v1) or a different gateway.",
  noBrowserCors: "This provider's API does not send CORS headers, so a web page cannot call it directly. Route it through OpenRouter or run the operation from the MCP server.",
  testConnection: "Makes one harmless request (list models) to confirm the URL is reachable and the key is accepted.",
  importOllama: "Reads the models you have pulled on this Ollama (ollama list) and adds them to the registry with verified ids and $0 pricing.",
  importOpenRouter: "Downloads OpenRouter's public catalog (no key needed) and lets you pick models to add with verified ids, context sizes and current prices.",
  exportRegistry: "Downloads the whole registry (bundled + your edits) as models.json, ready to drop into registry/ in the repo.",
  resetLocal: "Throws away every model, group, operation and hidden-model override stored in this browser. Keys and run history are kept.",
} as const;

/** Glossary for the help pane: term → definition, in a sensible reading order. */
export const GLOSSARY: { term: string; def: string }[] = [
  { term: "LLM", def: "Large language model: a model that reads and writes text (and often images) by predicting tokens. Everything in this registry is one." },
  { term: "Token", def: "The unit models read and bill in — roughly three-quarters of an English word. Prices and context windows are quoted in tokens." },
  { term: "Vendor", def: TIP.vendor },
  { term: "Provider", def: TIP.provider },
  { term: "Model id", def: TIP.modelId },
  { term: "Registry id", def: TIP.registryId },
  { term: "Closed / open-weight / open-source", def: TIP.access },
  { term: "Context window", def: TIP.contextWindow },
  { term: "Pricing", def: TIP.pricePair },
  { term: "Capabilities", def: TIP.capabilities },
  { term: "Tags", def: TIP.tags },
  { term: "Group", def: "A saved tag query. " + TIP.groupRule + " New models join matching groups automatically." },
  { term: "Operation", def: TIP.operation },
  { term: "System prompt", def: TIP.systemPrompt },
  { term: "Temperature", def: TIP.temperature },
  { term: "Max tokens", def: TIP.maxTokens },
  { term: "Run", def: "One operation sent to one set of models in parallel; the results sit side by side with latency, tokens and estimated cost." },
  { term: "Gateway (OpenRouter)", def: "A service that fronts many vendors behind one API and one key, with its own catalog and prices. Handy for comparisons; adds a small markup." },
  { term: "Local model (Ollama / LM Studio)", def: "A model whose weights are on this machine, served by a local program that speaks the same API as OpenAI. Free, offline, no key." },
  { term: "CORS", def: "The browser rule that stops a web page calling an API on another domain unless that API allows it. Local servers need an origin allow-list; a few vendors do not allow browser calls at all." },
  { term: "MCP server", def: "A small program an AI assistant can call as tools. The llm-registry server in FleetMcpServers reads this same registry file, so Claude can list models, resolve a group and run an operation." },
];
