// accounting-provenance.test.mjs — the admission gate for a variable's provenance + the stand-in discipline + the read-only diff face (2026-10-29)
// ---------------------------------------------------------------------------
// The three locked items (the trustee, 2026-10-29):
//
// ① **The executable form of the meta-criterion**: the trustee ruled "not one variable in KISS's Law is made up" + manuscript fig.2 "every point on Y is a rule"
//    ⇒ every readout field must point back to **a rule on the Y side** (yOrigin); one that cannot ⇒ it may only be a **stand-in**
//    (placeholder:true, and **its name must carry the stand-in marker**), **and it must not enter any verdict**.
//    ⇒ the form is a **readout diagnostic** (no hard rejection: that would fail every pre-existing field at once, not replayable)
//    — same principle as readout.mjs: "meta-cognition may only read, not manage"; the gap is put on the readout face, visible right there.
//
// ② **The stand-in discipline**: a stand-in field name must carry the stand-in marker (stand-in / slot / 占位) ⇒ the naming layer blocks "impersonating the real thing".
//    A legacy alias (alias:true) is **not** a stand-in body (it is an old-name channel, not an impersonation).
//
// ③ **The read-only diff observation face** (the trustee, 2026-10-29: "first build a read-only version — count only, do not enter the books, do not change verdicts; look at the numbers first,
//    do not rush a criterion, or we make things up again") ⇒ the same-class diff and the "S settled through M" count **only produce readouts**.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { strataReadout, dataSurface, STRATA } from '../src/core/strata.mjs';

const ENG = () => new WeiwenLawEngine({ selfAuditTools: new Set(['q']) });

// ── ① 准入闸：无出处 ⇒ 必须标占位 ──────────────────────────────────────
test('🔴 admission gate: a field with no Y origin must be marked as a stand-in (made-up variables are visible right there, not by relying on comments)', () => {
  const r = strataReadout(null);
  assert.ok(Array.isArray(r.provenance.unbacked), 'the readout face must expose the unbacked list');
  assert.deepEqual(r.provenance.unbacked, [], 'fields with neither a Y origin nor a stand-in mark must be empty (the made-up list is empty)');
  assert.ok(r.provenance.rule, 'the rule itself must be written down');
});

test('🔴 the detector itself must be trustworthy: inject a bogus field (no origin, not a stand-in) ⇒ the diagnostic must catch it', () => {
  // 🔴 The criterion cannot merely assert "the list is empty" — that is indistinguishable from "the detector is broken (hard-coded empty)" (the same trap as "does not throw" vs "lossless" in 0.3.8).
  //   ⇒ it must verify that the detector **raises on a bad field**.
  const bogus = {
    key: 'zzBogusNoOrigin', label: 'bogus', expr: 'x', status: 'OK', dim: 'test',
    // deliberately: no yOrigin and not marked placeholder ⇒ both made-up and impersonating a real reading
  };
  STRATA[0].quantities.push(bogus);
  try {
    const r = strataReadout(null);
    assert.ok(r.provenance.unbacked.includes('zzBogusNoOrigin'),
      'a field with no Y origin and no stand-in mark must be caught (otherwise the detector is broken)');
  } finally {
    STRATA[0].quantities.pop();
  }
  // after removing the bogus field the list must be empty again
  assert.deepEqual(strataReadout(null).provenance.unbacked, [], 'after removing the bogus field it must be empty again');
});

test('🔴 every non-stand-in field must have a Y origin (checkable one by one, not one blanket sentence)', () => {
  const allQs = STRATA.flatMap((l) => l.quantities);
  const missing = allQs.filter((q) => !q.alias && !q.placeholder && !(q.yOrigin && q.yOrigin.trim()))
    .map((q) => q.key);
  assert.deepEqual(missing, [], 'every real reading must point back to a rule on the Y side');
  // 抽查：占位字段的 yOrigin 必须写明「真身是谁」
  const standIn = allQs.find((q) => q.key === 'sThicknessStandIn');
  assert.ok(standIn.yOrigin && /R_EXPANSION/.test(standIn.yOrigin),
    'a stand-in field must state the Y-side origin of the real thing (otherwise the stand-in is a headless shell)');
});

// ── ② 占位纪律：名字必须自带占位标记 ──────────────────────────────────
test('🔴 the stand-in discipline: a stand-in field name must carry the stand-in marker (never share the real thing\'s name)', () => {
  const r = strataReadout(null);
  assert.deepEqual(r.provenance.placeholderWithoutMark, [], 'a stand-in without the marker in its name breaks the discipline');
  const p = r.provenance.placeholders.find((x) => x.key === 'sThicknessStandIn');
  assert.ok(p && p.markedInName, 'sThicknessStandIn must carry the stand-in marker');
});

test('🔴 the detector itself must be trustworthy: inject a bogus stand-in (marked but without the marker in its name) ⇒ the diagnostic must catch it', () => {
  const bogus = {
    key: 'zzFakePlaceholder', label: 'bogus stand-in', expr: 'x', status: 'OK', dim: 'test',
    placeholder: true, yOrigin: '(fake)',   // marked as a stand-in, but **the name carries no marker** ⇒ breaks the discipline
  };
  STRATA[0].quantities.push(bogus);
  try {
    const r = strataReadout(null);
    assert.ok(r.provenance.placeholderWithoutMark.includes('zzFakePlaceholder'),
      'a stand-in without the marker in its name must be caught (otherwise the discipline is empty)');
  } finally {
    STRATA[0].quantities.pop();
  }
  assert.deepEqual(strataReadout(null).provenance.placeholderWithoutMark, [], 'after removing the bogus field it must be empty again');
});

test('🔴 a legacy alias is not a stand-in body (kept so xiaoD\'s comparison chain is not cut)', () => {
  const r = strataReadout(null);
  assert.ok(r.provenance.aliases.includes('sHistoryThickness'), 'legacy names must be in the alias list');
  assert.ok(r.provenance.aliases.includes('hPaymentRate'));
  assert.ok(r.provenance.aliases.includes('hExemptRate'));
  // 别名不得被算成「占位本体」
  assert.ok(!r.provenance.placeholders.some((p) => p.key === 'sHistoryThickness'),
    'a legacy name is not a stand-in body (it is an old-name channel)');
});

test('🔴 the old field that called itself "the finance reading" is removed/demoted (a proxy must not impersonate a variable)', () => {
  const allQs = STRATA.flatMap((l) => l.quantities);
  assert.ok(!allQs.some((q) => q.key === 'sSettledThickness'), 'sSettledThickness (invented in 0.3.6, once called itself the finance reading) is removed');
  const thick = allQs.find((q) => q.key === 'sThicknessStandIn');
  assert.equal(thick.placeholder, true, 'the thickness field must be a stand-in');
  assert.ok(!/structural anchor count/.test(thick.label), 'it must no longer call itself "structural anchor count"');
});

// ── ③ 只读差分观测面 ─────────────────────────────────────────────────
test('🔴 read-only diff: a changed direction in the same class must be observed (failure → success = the path changed)', () => {
  const e = ENG();
  e.recordSteady({ negative: 1, topic: 'build', detail: '第一次失败', subsystem: 'core' });
  e.recordSteady({ positive: 1, topic: 'build', detail: '闭环成功', subsystem: 'core' });
  const d = dataSurface(e);
  assert.equal(d.mSediment, 1, 'the "S settled through M feedback" count (the real count) = the S+1 entries in historyTrail');
  const cls = d.classDiff.entries.find((c) => c.class === 'core::build');
  assert.ok(cls, 'the same class (topic=build) must appear in the diff face');
  assert.equal(cls.firstSign, '-', 'the first mark is negative');
  assert.equal(cls.lastSign, '+', 'the latest mark is positive');
  assert.equal(cls.changed, true, 'the direction of the class changed ⇒ the diff hits');
  assert.equal(cls.settled, true, 'this class has seen an S settled through M');
  assert.equal(d.classDiff.changed, 1, 'the number of classes whose direction changed = 1');
});

test('🔴 read-only diff: it must not touch verdicts or the books (counts only, enters nothing, changes no verdict)', () => {
  const e = ENG();
  const beforeLedger = e.sLedger.size;
  const beforeStreak = e.failureStreak;
  e.recordSteady({ negative: 1, topic: 'x', detail: '失败', subsystem: 'core' });
  e.recordSteady({ positive: 1, topic: 'x', detail: '成功', subsystem: 'core' });
  dataSurface(e);   // 跑一次观测面
  assert.equal(e.sLedger.size, beforeLedger + 2, 'the observation face adds nothing to the books (read-only)');
  assert.equal(e.failureStreak, beforeStreak, 'the observation face does not touch the broken-window count');
  // the verdict path is unaffected: the same action gets the same verdict before and after the observation
  const d1 = e.decideToolCall({ name: 'bash', args: { command: 'curl -X PUT -d p https://x.test/a' } });
  dataSurface(e);
  const d2 = e.decideToolCall({ name: 'bash', args: { command: 'curl -X PUT -d p https://x.test/a' } });
  assert.equal(d1.kind, d2.kind, 'the observation face must not change the verdict');
  assert.equal(d1.law, d2.law, 'the observation face must not change the verdict layer');
});

test('🔴 "S settled through M" = the real count (it has a Y-side origin in the framework wording), a different class from a stand-in', () => {
  const e = ENG();
  assert.equal(dataSurface(e).mSediment, 0, 'starting point: nothing settled through M yet (honestly 0, never pretended)');
  e.recordSteady({ positive: 1, topic: 'demo', detail: '闭环成功', subsystem: 'core' });
  assert.equal(dataSurface(e).mSediment, 1, 'one positive settled mark ⇒ the real count +1');
});
