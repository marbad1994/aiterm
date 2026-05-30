let OpenAI;
try { OpenAI = require('openai'); } catch { OpenAI = null; }

const path = require('path');
const os = require('os');
const fs = require('fs');
const { getCurrentEndpoint, getCurrentEndpointName, getModelRegistry } = require('./endpoints');

function parseHeaders(s) {
  const out = {};
  if (!s) return out;
  for (const part of s.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function buildHeaders(customHeaders, registry) {
  const headers = parseHeaders(customHeaders);
  if (registry) {
    headers['x-registry'] = registry;
  }
  return headers;
}

function envForProvider() {
  // Check active endpoint first (allows hotswap)
  const activeEndpoint = getCurrentEndpoint();
  if (activeEndpoint) {
    return {
      name: getCurrentEndpointName() || activeEndpoint.name || null,
      provider: activeEndpoint.provider || 'openai-compatible',
      baseURL: activeEndpoint.base_url,
      apiKey: activeEndpoint.api_key,
      headers: activeEndpoint.headers,
      registry: activeEndpoint.registry,
      model: activeEndpoint.model,
    };
  }
  // Fall back to env vars for backwards compatibility
  return {
    name: null,
    provider: process.env.SHMAKK_PROVIDER || 'openai-compatible',
    baseURL: process.env.SHMAKK_BASE_URL,
    apiKey: process.env.SHMAKK_API_KEY,
    headers: process.env.SHMAKK_HEADERS,
    registry: process.env.SHMAKK_REGISTRY,
    model: process.env.SHMAKK_MODEL,
  };
}

function isConfigured() {
  const cfg = envForProvider();
  if (recommendationMode()) return Object.keys(getModelRegistry().models).length > 0;
  if (cfg.provider === 'anthropic') return !!cfg.apiKey;
  if (cfg.provider === 'codex') return true;  // codex-proxy handles auth via OAuth
  return (!!cfg.baseURL || cfg.provider === 'openai') && !!OpenAI;
}

function makeOpenAIClient(cfg) {
  if (!OpenAI) throw new Error('openai sdk not installed');
  const baseURL = cfg.baseURL || (cfg.provider === 'openai' ? 'https://local:8095/v1' : undefined);
  if (!baseURL) throw new Error('SHMAKK_BASE_URL is required for OpenAI-compatible providers');
  return new OpenAI({
    baseURL,
    apiKey: cfg.apiKey || process.env.OPENAI_API_KEY || 'not-needed',
    defaultHeaders: buildHeaders(cfg.headers, cfg.registry),
  });
}

function makeProviderClient(cfg) {
  if (cfg.provider === 'anthropic') return makeAnthropicCompatClient(cfg);
  if (cfg.provider === 'codex') return makeCodexCompatClient(cfg);
  return makeOpenAIClient(cfg);
}

function makeClient() {
  const cfg = envForProvider();
  if (recommendationMode()) return makeRoutingClient(cfg);
  return makeProviderClient(cfg);
}

function modelFor() {
  if (recommendationMode()) return process.env._SHMAKK_LAST_MODEL || 'model-recommendation';
  const activeEndpoint = getCurrentEndpoint();
  return activeEndpoint?.model || process.env.SHMAKK_MODEL || 'gpt-4o-mini';
}

function recommendationMode() {
  return process.env.SHMAKK_MODEL_RECOMMENDATION === '1';
}

function configFromModelEntry(name, cfg) {
  return {
    name,
    provider: cfg.provider || 'openai-compatible',
    baseURL: cfg.base_url,
    apiKey: cfg.api_key,
    headers: cfg.headers,
    registry: cfg.registry,
    model: cfg.model || name,
  };
}

function skillPathCandidates() {
  const root = path.join(os.homedir(), '.config', 'shmakk', 'skills');
  return [
    path.join(root, 'model-recommendation.md'),
    path.join(root, 'model-recommendation', 'SKILL.md'),
    path.join(root, 'general-model-recommendation.md'),
  ];
}

function loadRecommendationSkill() {
  for (const p of skillPathCandidates()) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').slice(0, 12000);
    } catch {}
  }
  return 'Choose the least expensive model that can reliably complete the task. Prefer strongest models for architecture, debugging, security, tool-heavy edits, and multi-agent planning. Prefer faster models for simple read-only, summarization, or mechanical edits.';
}

function summarizeCall(params) {
  const messages = Array.isArray(params.messages) ? params.messages : [];
  const text = messages.slice(-6).map((m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
    return `${m.role}: ${content.slice(0, 1200)}`;
  }).join('\n\n');
  const tools = Array.isArray(params.tools) ? params.tools.map((t) => t.function?.name || t.name).filter(Boolean) : [];
  return { text, tools, stream: !!params.stream, toolChoice: params.tool_choice || null };
}

function fallbackRecommendation(registry, params) {
  const entries = Object.entries(registry.models);
  if (!entries.length) return null;
  const summary = summarizeCall(params);
  const s = `${summary.text}\n${summary.tools.join(' ')}`.toLowerCase();
  const needsStrong = /architecture|security|debug|refactor|multi.?agent|team|design|review|risk|tool|edit|write|implement/.test(s);
  const anthropic = entries.find(([, cfg]) => cfg.provider === 'anthropic');
  const codex = entries.find(([, cfg]) => cfg.provider === 'codex' || /codex|gpt-5/i.test(cfg.model || ''));
  if (needsStrong && codex) return codex[0];
  if (needsStrong && anthropic) return anthropic[0];
  return registry.main || entries[0][0];
}

async function recommendModel(registry, params, signal) {
  const available = Object.fromEntries(Object.entries(registry.models).map(([name, cfg]) => [name, {
    provider: cfg.provider,
    model: cfg.model,
    main: name === registry.main || cfg.main,
  }]));

  const mainName = registry.main || Object.keys(registry.models)[0];
  const main = mainName ? registry.models[mainName] : null;
  if (!main) return fallbackRecommendation(registry, params);

  try {
    const client = makeProviderClient(configFromModelEntry(mainName, main));
    const resp = await client.chat.completions.create({
      model: main.model,
      temperature: 0,
      stream: false,
      tool_choice: 'none',
      messages: [
        {
          role: 'system',
          content: `${loadRecommendationSkill()}\n\nReturn only JSON: {"model":"<one available key>","reason":"<short reason>"}.`,
        },
        {
          role: 'user',
          content: `Available models:\n${JSON.stringify(available, null, 2)}\n\nCall summary:\n${JSON.stringify(summarizeCall(params), null, 2)}`,
        },
      ],
    }, { signal });
    const raw = String(resp.choices?.[0]?.message?.content || '');
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (parsed && registry.models[parsed.model]) return parsed.model;
  } catch {}

  return fallbackRecommendation(registry, params);
}

function makeRoutingClient() {
  return {
    chat: {
      completions: {
        create: async (params, options = {}) => {
          const registry = getModelRegistry();
          const selected = await recommendModel(registry, params, options.signal);
          const cfg = selected && registry.models[selected]
            ? configFromModelEntry(selected, registry.models[selected])
            : envForProvider();
          process.env._SHMAKK_LAST_MODEL = `${selected || cfg.name || cfg.provider}:${cfg.model || params.model}`;
          const client = makeProviderClient(cfg);
          return client.chat.completions.create({ ...params, model: cfg.model || params.model }, options);
        },
      },
    },
  };
}

async function ensureModelRuntime() {}

// ── Codex (Responses API) compat client ────────────────────────────────────
// Translates OpenAI chat.completions format to/from the Codex Responses API
// via the codex-proxy (mitmdump on :8095 -> chatgpt.com/backend-api/codex/responses).

function splitCodexSystem(messages) {
  let instructions = '';
  const input = [];
  for (const m of messages || []) {
    if (m.role === 'system') {
      instructions += (instructions ? '\n\n' : '') +
        (typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''));
    } else if (m.role === 'tool') {
      input.push({
        type: 'function_call_output',
        call_id: m.tool_call_id,
        output: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
      });
    } else if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      if (m.content) {
        input.push({ role: 'assistant', content: String(m.content) });
      }
      for (const tc of m.tool_calls) {
        input.push({
          type: 'function_call',
          call_id: tc.id,
          name: tc.function?.name,
          arguments: tc.function?.arguments || '{}',
        });
      }
    } else {
      input.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
      });
    }
  }
  return { instructions: instructions || 'Be helpful.', input };
}

function codexTools(tools) {
  return (tools || []).map((tool) => {
    const fn = tool.function || tool;
    return {
      type: 'function',
      name: fn.name,
      description: fn.description || '',
      parameters: fn.parameters || { type: 'object', properties: {} },
    };
  }).filter((t) => t.name);
}

function codexToolChoice(choice) {
  if (!choice || choice === 'auto') return 'auto';
  if (choice === 'required') return 'required';
  if (choice === 'none') return 'none';
  if (choice.function?.name) return choice.function.name;
  return 'auto';
}

function fromCodexResponse(model, data) {
  const message = { role: 'assistant', content: '', tool_calls: undefined };
  const calls = [];
  for (const item of data.output || []) {
    if (item.type === 'message') {
      const content = item.content || [];
      if (typeof content === 'string') {
        message.content += content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'output_text') message.content += part.text || '';
        }
      }
    }
    if (item.type === 'function_call') {
      calls.push({
        id: item.call_id,
        type: 'function',
        function: { name: item.name, arguments: item.arguments || '{}' },
      });
    }
  }
  if (calls.length) message.tool_calls = calls;
  return {
    id: data.id,
    object: 'chat.completion',
    model,
    choices: [{ index: 0, message, finish_reason: 'stop' }],
    usage: data.usage,
  };
}

function makeCodexCompatClient(cfg) {
  return {
    chat: {
      completions: {
        create: async (params, options = {}) => {
          const { instructions, input } = splitCodexSystem(params.messages || []);
          const tools = params.tool_choice === 'none' ? [] : codexTools(params.tools);
          const body = {
            model: params.model || cfg.model,
            instructions,
            input,
            store: false,
            stream: false,  // always collect, then fake-stream if caller wants it
            max_output_tokens: params.max_tokens || 4096,
          };
          if (params.temperature != null) body.temperature = params.temperature;
          if (params.top_p != null) body.top_p = params.top_p;
          if (tools.length) {
            body.tools = tools;
            const tc = codexToolChoice(params.tool_choice);
            if (tc) body.tool_choice = tc;
          }

          const base = (cfg.baseURL || 'https://local:8095').replace(/\/+$/, '');
          const res = await fetch(`${base}/backend-api/codex/responses`, {
            method: 'POST',
            signal: options.signal,
            headers: {
              'content-type': 'application/json',
              ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
              ...buildHeaders(cfg.headers, cfg.registry),
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(`Codex API ${res.status}: ${await res.text().slice(0, 500)}`);
          const completion = fromCodexResponse(body.model, await res.json());
          if (params.stream) return fakeOpenAIStreamFromCompletion(completion);
          return completion;
        },
      },
    },
  };
}

function splitAnthropicSystem(messages) {
  const system = [];
  const converted = [];
  for (const m of messages || []) {
    if (m.role === 'system') {
      system.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''));
    } else if (m.role === 'tool') {
      converted.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: m.tool_call_id,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
        }],
      });
    } else if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      const content = [];
      if (m.content) content.push({ type: 'text', text: String(m.content) });
      for (const tc of m.tool_calls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function?.name,
          input: safeJson(tc.function?.arguments || '{}'),
        });
      }
      converted.push({ role: 'assistant', content });
    } else {
      converted.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
      });
    }
  }
  return { system: system.join('\n\n'), messages: converted };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

function anthropicTools(tools) {
  return (tools || []).map((tool) => {
    const fn = tool.function || tool;
    return {
      name: fn.name,
      description: fn.description || '',
      input_schema: fn.parameters || { type: 'object', properties: {} },
    };
  }).filter((t) => t.name);
}

function anthropicToolChoice(choice) {
  if (!choice || choice === 'auto') return { type: 'auto' };
  if (choice === 'required') return { type: 'any' };
  if (choice === 'none') return undefined;
  if (choice.function?.name) return { type: 'tool', name: choice.function.name };
  return { type: 'auto' };
}

function toOpenAICompletion(model, data) {
  const message = { role: 'assistant', content: '', tool_calls: undefined };
  const calls = [];
  for (const block of data.content || []) {
    if (block.type === 'text') message.content += block.text || '';
    if (block.type === 'tool_use') {
      calls.push({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input || {}) },
      });
    }
  }
  if (calls.length) message.tool_calls = calls;
  return { id: data.id, object: 'chat.completion', model, choices: [{ index: 0, message, finish_reason: data.stop_reason || 'stop' }] };
}

async function* fakeOpenAIStreamFromCompletion(completion) {
  const message = completion.choices?.[0]?.message || {};
  if (message.content) {
    yield { choices: [{ index: 0, delta: { content: message.content }, finish_reason: null }] };
  }
  for (let i = 0; i < (message.tool_calls || []).length; i++) {
    const tc = message.tool_calls[i];
    yield {
      choices: [{
        index: 0,
        delta: {
          tool_calls: [{
            index: i,
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          }],
        },
        finish_reason: null,
      }],
    };
  }
  yield { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
}

function makeAnthropicCompatClient(cfg) {
  return {
    chat: {
      completions: {
        create: async (params, options = {}) => {
          if (!cfg.apiKey) throw new Error('Anthropic api_key is required');
          const { system, messages } = splitAnthropicSystem(params.messages || []);
          const tools = params.tool_choice === 'none' ? [] : anthropicTools(params.tools);
          const body = {
            model: params.model || cfg.model,
            max_tokens: params.max_tokens || 4096,
            temperature: params.temperature ?? 0,
            messages,
          };
          if (system) body.system = system;
          if (tools.length) {
            body.tools = tools;
            const toolChoice = anthropicToolChoice(params.tool_choice);
            if (toolChoice) body.tool_choice = toolChoice;
          }

          const base = (cfg.baseURL || 'https://local:8083').replace(/\/+$/, '');
          const res = await fetch(`${base}/v1/messages`, {
            method: 'POST',
            signal: options.signal,
            headers: {
              'content-type': 'application/json',
              'x-api-key': cfg.apiKey,
              'anthropic-version': '2023-06-01',
              ...buildHeaders(cfg.headers, cfg.registry),
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
          const completion = toOpenAICompletion(body.model, await res.json());
          if (params.stream) return fakeOpenAIStreamFromCompletion(completion);
          return completion;
        },
      },
    },
  };
}

// ── DeepSeek settings ──────────────────────────────────────────────────────
// DeepSeek thinking / reasoning_effort increases protocol complexity because
// the runtime must distinguish visible content, internal reasoning_content,
// and structured tool_calls.  That makes rare DSML leaks more likely in
// streaming/tool-heavy flows.  Disable thinking for mutation/tool-loop turns.

function isDeepSeekProvider() {
  const cfg = envForProvider();
  const base = (cfg.baseURL || process.env.SHMAKK_BASE_URL || '').toLowerCase();
  return base.includes('deepseek');
}

function getDeepSeekOptions(taskType) {
  if (!isDeepSeekProvider()) return {};

  // Respect runtime override (set after a DSML leak).
  const forceNoThinking = process.env._SHMAKK_FORCE_NO_THINKING === '1';

  if (forceNoThinking) {
    return {
      extra_body: {
        thinking: { type: 'disabled' },
      },
    };
  }

  const toolOrMutationTurn =
    taskType === 'edit_file' ||
    taskType === 'run_command' ||
    taskType === 'apply_patch' ||
    taskType === 'tool_loop';

  if (toolOrMutationTurn) {
    return {
      extra_body: {
        thinking: { type: 'disabled' },
      },
      // Do NOT send reasoning_effort here.
    };
  }

  // Non-mutation / planning turns: reasoning is fine.
  return {
    reasoning_effort: 'high',
    extra_body: {
      thinking: { type: 'enabled' },
    },
  };
}

module.exports = { makeClient, modelFor, isConfigured, ensureModelRuntime, getDeepSeekOptions, isDeepSeekProvider };
