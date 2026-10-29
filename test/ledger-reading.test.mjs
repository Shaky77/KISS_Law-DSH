// 0.3.5: xiaoD #39/#40's two hard defects — ① the readout face emits invalid JSON (serialization bug)
//   ② the negative-value convention is violated: running dry and being overdrawn were mixed
//                                             ② 负值口径违例：见底与透支混在一起
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';

const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });

test('🔴 序列化加固：账本条目带**真不可序列化**的值 ⇒ 读数面必须仍能 JSON 化', () => {
  const e = ENG();
  const cyclic = { name: 'loop' }; cyclic.self = cyclic;      // a cycle ⇒ JSON.stringify throws
  const withFn = { fn: () => 1 };                              // a function ⇒ JSON-ifying drops it (not lossless)
  e.recordSteady({ positive: 1, detail: 'credit', subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: cyclic, subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: withFn, subsystem: 'probe' });
  e.recordSteady({ executed: true, negative: 1, attrib: { layer: 'network-send', method: 'command', signal: 'curl -X PUT' }, action: 'curl -X PUT', subsystem: 'exfil' });
  assert.doesNotThrow(() => JSON.stringify(e.snapshot()), 'snapshot 必须可序列化（循环引用不得带进账本）');
  assert.doesNotThrow(() => JSON.stringify(e.steadyLedger()), 'the ledger must be serializable');
  // 🔴 Key: the host reports "value is not **lossless** JSON" — JSON-ifying may NOT throw yet still
  //   **silently drop values** (functions/cycles) — that is broken too. ⇒ the criterion is losslessness:
  //   text fields in the readout face must be strings, and a JSON round trip must lose nothing.
  const roundTrip = JSON.parse(JSON.stringify(e.steadyLedger()));
  for (const entry of roundTrip) {
    for (const [k, v] of Object.entries(entry)) {
      if (v !== null && typeof v === 'object') {
        assert.fail(`ledger entry field ${k} is still an object ⇒ a JSON round trip drops values (not lossless): ${JSON.stringify(v).slice(0, 60)}`);
      }
    }
  }
  const raw = JSON.stringify(e.steadyLedger());
  assert.ok(raw.length > 0, 'the ledger must not be empty (entries exist but cannot be read = a false reading)');
});

test('🔴 running dry and overdrawn read apart: effectiveS is the reserve (floor 0), overdraft is what is owed', () => {
  const e = ENG();
  e.recordSteady({ positive: 2, detail: 'credit', subsystem: 'probe' });
  // Bucket reading: effectiveS = min(the nets) ⇒ core is still 0 ⇒ the shortest bucket is core ⇒ reading 0
  //   (that is the bucket law, not an overdraft).
  assert.equal(e.sBySubsystem.probe, 2, "that subsystem's net equals the credited amount");
  assert.equal(e.effectiveS(), 0, 'shortest bucket (core=0) ⇒ the reserve reading is 0');
  assert.equal(e.overdraft(), 0, 'nothing owed at this point');
  e.recordSteady({ negative: 5, detail: 'erosion', subsystem: 'probe' });
  assert.equal(e.sBySubsystem.probe, -3, "a subsystem's net may go negative (that is a fact, not the reserve reading)");
  assert.equal(e.effectiveS(), 0, 'the reserve reading has a floor of 0 (0 = no reserve left, not a negative reserve)');
  assert.equal(e.overdraft(), 3, 'owing is a separate quantity (the overdraft amount), never folded into the reserve');
});

test('the overdraft reading is visible in the snapshot (owing must be readable, never disguised as "a little left")', () => {
  const e = ENG();
  e.recordSteady({ negative: 2, detail: 'erosion', subsystem: 'core' });
  const snap = e.snapshot();
  assert.equal(snap.effectiveS, 0);
  assert.equal(snap.overdraft, 2, 'the overdraft amount must be in the readout face');
});

test('a neutral mark does not inflate the reserve (release ≠ gain: sign=0 only leaves a trace)', () => {
  const e = ENG();
  e.recordSteady({ executed: true, detail: 'neutral action', subsystem: 'core' });
  assert.equal(e.effectiveS(), 0, 'a neutral mark does not change the reserve');
  assert.equal(e.overdraft(), 0, 'a neutral mark creates no overdraft');
});

// ── 0.3.6 (xiaoD #41): the ΣS tap was the running ledger, not the anchors — finance and accounting must read apart ──
test('🔴 unknown events (H paid nothing) raise the event count, not the settled thickness (the accounting ledger must not enter the finance ledger)', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  e.recordSteady({ positive: 1, detail: 'with direction', subsystem: 'probe' });
  e.recordSteady({ negative: 1, detail: 'negative with direction', subsystem: 'probe' });
  e.recordSteady({ executed: true, detail: 'unknown event (H paid nothing)', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.eventCount, 3, 'accounting reading: three discrete events');
  assert.equal(d.settledThickness, 2, 'finance reading: only the two marks with a direction count as settled');
  assert.equal(d.thickness, 3, 'thickness keeps the event count (accounting reading), but the name and note now say so');
});

test('🔴 sNow shares one source with the engine reserve reading (never 0 in one place and −1 in another)', async () => {
  const { dataSurface } = await import('../src/core/strata.mjs');
  const e = ENG();
  e.recordSteady({ negative: 3, detail: 'erosion', subsystem: 'probe' });
  const d = dataSurface(e);
  assert.equal(d.sNow, e.effectiveS(), 'sNow must share the source with engine.effectiveS');
  assert.ok(d.sNow >= 0, 'the reserve reading must not be negative');
  assert.equal(d.sOverdraft, e.overdraft(), 'the overdraft must share the source with engine.overdraft');
});
