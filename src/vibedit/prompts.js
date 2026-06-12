// Prompts for the vibedit overlay chat, save, and flow operations.
// Kept short and rigid for compatibility with smaller models.

function chatSystem() {
  return `You are a frontend editing assistant embedded in a live web page.
You receive the page DOM (pruned) and a user request. You answer briefly and,
when the user asks for a visible change, you return DOM operations.

If you also receive recorded user interactions (click/scroll/input events with timestamps), use the recorded selectors as the best source of truth for what elements the user interacted with.

YOU MUST RESPOND WITH ONLY A RAW JSON OBJECT. No markdown. No backticks. No preamble. No "Here you go". NOTHING except the JSON object.

{
  "reply": "one or two short sentences for the user",
  "ops": [
    { "selector": "css selector", "action": "setText", "value": "new text" },
    { "selector": "css selector", "action": "setStyle", "style": { "color": "#ff0000" } },
    { "selector": "css selector", "action": "setHTML", "value": "<b>html</b>" },
    { "selector": "css selector", "action": "setAttr", "name": "src", "value": "..." },
    { "selector": "css selector", "action": "remove" }
  ]
}
Rules:
- Use selectors that exist in the provided DOM. Prefer ids, then stable class names.
- If recorded interactions are provided, prefer selectors from the recorded events.
- If no visual change is requested, return "ops": [].
- Never invent selectors. If unsure, say so in "reply" and return no ops.`;
}

function chatUser(msg) {
  const sel = msg.selected ? `\nCurrently selected element:\n${msg.selected.slice(0, 1500)}\n` : "";
  return `Page URL: ${msg.url}
Page title: ${msg.title}
${sel}
Pruned DOM:
${(msg.dom || "").slice(0, 9000)}

User request: ${msg.text}`;
}

// ── Save = produce a structured functionality specification ──────────
// The spec is handed to shmakk PM, which handles all actual file edits
// across backend and frontend. Vibedit only does in-browser visual changes.

function saveSystem() {
  return `You are a visual-to-specification translator. You receive:
1. A list of live DOM changes the user made visually in the browser (BEFORE → AFTER).
2. Candidate source files for context.

Your job: produce a STRUCTURED FUNCTIONALITY SPECIFICATION that describes what
needs to be implemented. You do NOT output code or edit blocks. Another system
(shmakk PM) will read your spec and make all the actual code edits across the
full stack (backend, frontend, config, database, etc.).

Output ONLY a JSON object, no markdown fences, in this exact shape:

{
  "summary": "One sentence summarizing the overall change",
  "goals": ["goal 1", "goal 2"],
  "affectedComponents": [
    {
      "file": "relative/path/from/project/root",
      "role": "React component | CSS stylesheet | API route | config | etc.",
      "changes": "specific description of what needs to change in this file"
    }
  ],
  "uiChanges": [
    "List each visible change: what element, what property, old → new value"
  ],
  "behaviorChanges": [
    "Any interaction, state, or data flow changes needed"
  ],
  "backendRequirements": [
    "Any API endpoints, database changes, or server logic needed (empty if none)"
  ],
  "implementationNotes": "Any ordering constraints, gotchas, or extra context"
}

Rules:
- The affectedComponents list is the most important field. Be specific about what
  file needs what change. Use the exact relative paths from the candidate files.
- If a change can't be mapped to any provided file, list it with your best guess.
- For CSS changes: describe which rule/selector and what properties change.
- For text changes: say exactly what text node needs updating in which component.
- If backend work is needed (new API endpoint, DB schema change, etc.), describe
  it clearly in backendRequirements.
- Keep each description actionable and concrete. No vague "update the styling."`;
}

function saveUser(msg, shortlist) {
  const changes = msg.changes.map((c, i) => c.kind === "css"
    ? `CHANGE ${i + 1} (CSS rule for selector ${c.selector})
EXISTING RULE(S) IN THE PAGE:
${(c.before || "").slice(0, 1500)}
USER'S NEW DECLARATIONS:
${(c.after || "").slice(0, 1500)}`
    : `CHANGE ${i + 1} (selector: ${c.selector})
BEFORE:
${(c.before || "").slice(0, 1800)}
AFTER:
${c.after === "" ? "(element deleted)" : (c.after || "").slice(0, 1800)}`
  ).join("\n\n");

  const files = shortlist.map((f) =>
    `===== FILE: ${f.path}${f.truncated ? " (truncated, '...' marks gaps)" : ""} =====\n${f.content}`
  ).join("\n\n");

  return `Page URL: ${msg.url}

The user made these visual changes in the browser (already applied live):

${changes}

Candidate source files for context:
${files}

Produce the structured functionality specification JSON now. Do NOT output edit blocks or code. Output ONLY the JSON spec.`;
}

function flowUser(msg, events, shortlist) {
  const evLines = events
    .filter((e) => e.kind !== "shot")
    .slice(0, 80)
    .map((e) => {
      if (e.kind === "click") return `[${(e.t / 1000).toFixed(1)}s] click ${e.selector} "${(e.text || "").slice(0, 60)}"`;
      if (e.kind === "scroll") return `[${(e.t / 1000).toFixed(1)}s] scroll to y=${e.y}`;
      if (e.kind === "input") return `[${(e.t / 1000).toFixed(1)}s] typed in ${e.selector}`;
      if (e.kind === "nav") return `[${(e.t / 1000).toFixed(1)}s] navigated to ${e.url}`;
      return `[${(e.t / 1000).toFixed(1)}s] ${e.kind}`;
    }).join("\n");

  const files = shortlist.map((f) =>
    `===== FILE: ${f.path}${f.truncated ? " (truncated, '...' marks gaps)" : ""} =====\n${f.content}`
  ).join("\n\n");

  return `The user recorded this interaction flow on the page:

${evLines}

Pruned DOM at the end of the recording:
${(msg.dom || "").slice(0, 7000)}

The user wants the flow changed like this:
"${msg.instruction}"

Candidate source files:
${files}

Produce the structured functionality specification JSON now. Do NOT output edit blocks or code. Output ONLY the JSON spec.`;
}

module.exports = { chatSystem, chatUser, saveSystem, saveUser, flowUser };
