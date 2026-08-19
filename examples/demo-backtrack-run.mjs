// ============================================================
// Post-alignment re-run: verify with DeepSeek API that "logic backtracking can locate the stuck point along the R containment axis"
// Prereq: DeepSeek API Key at C:/Users/Administrator/.workbuddy/deepseek_api_key.txt
// Conclusion: after the model calls query_logic_backtracking, it independently backtracks the path
//   sub-rule layer → Micro → Macro → Earth → Cosmic, with the stuck point landing on the innermost sub-rule layer (re-verify judges premise distorted).
// ============================================================
import { THREE_IRON_LAWS, CALIBRATION, R_DOMAIN } from '../src/core/law.mjs';
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
const log = (t, o) => { console.log('\n' + '='.repeat(60) + '\n  ' + t + '\n' + '='.repeat(60)); console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2)); };

// Two tools: iron laws (original) + logic backtracking / R hierarchy (added post-alignment)
const tools = [
  { type: 'function', function: { name: 'query_iron_laws', description: 'Return KISS\'s Law finalized three iron laws (immutable): inner H inviolability / First-Bug Halt / never abandon any node.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'query_logic_backtracking', description: 'Return the parallel definition of logic backtracking and First-Bug Halt, the R containment hierarchy, and each level\'s sub-nesting rules. For tracing along R layers to locate the fault root-cause layer.', parameters: { type: 'object', properties: {} } } },
];

const messages = [
  { role: 'system', content: 'You are an assistant plugged into KISS\'s Law white-box self-check tools. On framework mechanisms you must call the tool to verify first; answering from memory is forbidden.' },
  { role: 'user', content: 'There was a system that crashed on every startup and was repeatedly restarted externally, seeming to fall into infinite recursion. By KISS\'s Law, which hierarchy should logic backtracking trace along? Where does the stuck point finally land? Call query_logic_backtracking to verify before answering (give the hierarchy path + stuck layer in one sentence).' },
];

log('Request sent to DeepSeek (with backtracking tool)', { model: 'deepseek-chat', tools: tools.map(t => t.function.name) });
const r1 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 600 });
const msg1 = r1.choices[0].message;
log('Round ① return (does the model choose to call the tool)', msg1);

// Local execution: feed back the post-alignment backtracking definition
const toolResult = { calibration: CALIBRATION, rDomain: R_DOMAIN };
log('Local execute query_logic_backtracking (data from post-alignment law.mjs)', toolResult);

messages.push(msg1, { role: 'tool', tool_call_id: msg1.tool_calls[0].id, content: JSON.stringify(toolResult) });
const r2 = await callDeepSeek({ model: 'deepseek-chat', messages, tools, max_tokens: 400 });
log('Round ② final answer (based on tool-returned original text)', r2.choices[0].message.content);

log('Bill', { round1: `${r1.usage.prompt_tokens}in+${r1.usage.completion_tokens}out`, round2: `${r2.usage.prompt_tokens}in+${r2.usage.completion_tokens}out`, actualModel: r1.model });
