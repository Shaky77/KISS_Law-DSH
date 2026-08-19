// ============================================================
// KISS's Law × DeepSeek API: bare-handed tool-call loop demo (original re-run)
// Reproduces what the DSH harness does at the API level:
//   ① send task + tool list to the model
//   ② model decides which tool to call (returns tool_calls)
//   ③ execute the tool locally (read KISS's Law real data from law.mjs)
//   ④ feed the tool result back to the model → get the final answer
// Verifies: engine no regression, three iron laws verbatim (data comes from the tool, not model memory).
// Prereq: DeepSeek API Key at C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
// ============================================================
import { THREE_IRON_LAWS } from '../src/core/law.mjs';
import { readFileSync } from 'node:fs';

const KEY = readFileSync('C:/Users/Administrator/.workbuddy/deepseek_api_key.txt', 'utf-8').trim();

async function callDeepSeek(body) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

const log = (title, obj) => {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
};

// ---------- Step ①: task + tool list ----------
const messages = [
  { role: 'system', content: 'You are an assistant plugged into KISS\'s Law white-box self-check tools. When facing framework questions, call the tool to verify first; do not answer from memory.' },
  { role: 'user', content: 'What are the three iron laws of KISS\'s Law? You must call the tool to verify first, then summarize in one sentence.' },
];
const tools = [{
  type: 'function',
  function: {
    name: 'query_iron_laws',
    description: 'Return the finalized text of KISS\'s Law three iron laws (immutable): inner H inviolability / First-Bug Halt / never abandon any node. For the model to calibrate direction and self-check boundaries.',
    parameters: { type: 'object', properties: {} },
  },
}];

log('Step ① request sent to DeepSeek (task + tool list)', { model: 'deepseek-chat', messages, tools });

// ---------- Step ②: model decides to call the tool ----------
const r1 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 500 });
const msg1 = r1.choices[0].message;
log('Step ② DeepSeek first-round return (model itself decides to call the tool)', msg1);

// ---------- Step ③: execute the tool locally (KISS's Law engine intervenes here) ----------
const toolResult = { ironLaws: THREE_IRON_LAWS };
log('Step ③ locally execute query_iron_laws (data from plugin law.mjs, not model memory)', toolResult);

// ---------- Step ④: feed result back, get final answer ----------
messages.push(msg1, {
  role: 'tool',
  tool_call_id: msg1.tool_calls[0].id,
  content: JSON.stringify(toolResult),
});
const r2 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 300 });
log('Step ④ final answer (based on the tool-returned original text, not model memory)', r2.choices[0].message.content);

// ---------- Bill ----------
const total = {
  round1: `${r1.usage.prompt_tokens} in + ${r1.usage.completion_tokens} out`,
  round2: `${r2.usage.prompt_tokens} in + ${r2.usage.completion_tokens} out`,
  actualModel: r1.model,
};
log('Bill (off-peak)', total);
