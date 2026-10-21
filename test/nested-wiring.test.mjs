// 四层嵌套 ＋ M 公式方向 的机械锁
// ════════════════════════════════════════════════════════════════════
// 来由（安 2026-10-20 11:28）：「每个变量内部都有嵌套结构存在……套回公式 M=(R×S)/(D×H)」
//
// 这条锁要锁住四件**各自会单独出错**的事：
//   ① 四层各自都有宏观／微观两形态 —— 缺一层就是又被压平了；
//   ② M 的偏导符号方向（H 升 ⇒ M 降，原文 direction 明写）—— 符号错了整个公式反了；
//   ③ **绝不输出 M 的数值** —— 原文明令「定性方向关系，不赋值」；
//   ④ `↔` **不是算子**，是 H 内部嵌套的位置标记（安 10-20 裁定）；
//      锁「不许被实现成算子」比锁「我找不到」更重要。
//
// 🔴 双向验证：正常态全绿；删 micro / 翻 H 符号 / 给 M 塞数值 ⇒ 立刻红。
// ════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

import {
  NEST, NESTED_VARS, M_SIGN, mDirection, mTwoLayer, M_CONSTRAINT, nestAudit, nestStop,
  mConstraintShape,
} from '../src/core/nested.mjs';
import { R_CAPACITY, R_DOMAIN_FAMILIES, familyOf, familyMacro, rCapAudit } from '../src/core/rCapacity.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX = join(HERE, '..', 'src', 'index.js');
const LAW = join(HERE, '..', 'src', 'core', 'law.mjs');

// ═══════════════════════════════════════════════════════════════════
// ① 四层嵌套齐全
// ═══════════════════════════════════════════════════════════════════
test('① 四层齐全：R / S / D / H 各有宏观＋微观两形态', () => {
  assert.deepEqual(Object.keys(NESTED_VARS), ['R', 'S', 'D', 'H']);
  for (const [k, v] of Object.entries(NESTED_VARS)) {
    assert.strictEqual(v.key, k);
    assert.ok(v.macro && v.macro.length > 4, `${k} 缺宏观形态`);
    assert.ok(v.micro && v.micro.length > 4, `${k} 缺微观形态`);
    assert.notStrictEqual(v.macro, v.micro, `${k} 宏观与微观写成了同一句 ⇒ 等于没展开`);
  }
});

test('② 每层都有「服从关系」与「展开到哪停」—— 否则展开没有终点', () => {
  for (const [k, v] of Object.entries(NESTED_VARS)) {
    assert.ok(v.binds, `${k} 缺 binds（宏观微观谁服从谁）`);
    assert.ok(v.stopAt, `${k} 缺 stopAt（展开到哪停）`);
  }
  // 🔴 反向：嵌套必须有终点，否则「微观之下还有微观」会无限下切
  assert.ok(/条/.test(NESTED_VARS.R.stopAt), 'R 的终止应当是「落到具体条款」');
  assert.ok(/签/.test(NESTED_VARS.H.stopAt), 'H 的终止应当是「谁签字」');
});

test('③ H 是唯一「本体不随粒度变」的变量 —— 这是它能当嵌套锚的根据', () => {
  assert.ok(NESTED_VARS.H.invariance, 'H 必须显式声明不变性');
  assert.ok(/不随粒度变|不变/.test(NESTED_VARS.H.invariance));
  // 其余三层不该有 invariance（有则说明定义随粒度漂了）
  for (const k of ['R', 'S', 'D']) {
    assert.strictEqual(NESTED_VARS[k].invariance, undefined, `${k} 不该声明不变性`);
  }
});

test('④ 医疗实例四层俱全（安给的那个例子必须落成可核项）', () => {
  for (const k of ['R', 'S', 'D', 'H']) {
    const m = NESTED_VARS[k].medical;
    assert.ok(m && m.macro && m.micro, `${k} 缺医疗实例`);
    assert.notStrictEqual(m.macro, m.micro);
  }
  // 安的四个具体指向必须在场
  assert.ok(/医疗行业/.test(NESTED_VARS.R.medical.macro), 'R 的宏观应是「医疗行业定域」');
  assert.ok(/标准/.test(NESTED_VARS.S.medical.macro), 'S 应是「已定的标准规范」');
  assert.ok(/临床试验|药品研发/.test(NESTED_VARS.D.medical.macro), 'D 应是「需要处理的事项」');
  assert.ok(/AI|人类/.test(NESTED_VARS.H.medical.micro), 'H 的微观应是「AI 还是人类」');
});

test('⑤ 反证：删掉任一层 micro ⇒ 体检必须红', () => {
  for (const k of ['R', 'S', 'D', 'H']) {
    const broken = { ...NESTED_VARS, [k]: { ...NESTED_VARS[k], micro: '' } };
    const a = nestAudit(broken);
    assert.strictEqual(a.verdict, 'fail', `删掉 ${k}.micro 竟没红`);
  }
  const okAll = nestAudit();
  assert.strictEqual(okAll.verdict, 'pass');
  assert.strictEqual(okAll.count.malformed, 0);
});

// ═══════════════════════════════════════════════════════════════════
// ② M 的方向（符号错了整个公式就反了）
// ═══════════════════════════════════════════════════════════════════
test('⑥ 偏导符号：R↑ S↑ ⇒ M↑ ／ D↑ H↑ ⇒ M↓', () => {
  assert.deepEqual(M_SIGN, { R: +1, S: +1, D: -1, H: -1 });
  assert.strictEqual(mDirection({ R: 1 }).dir, 'up');
  assert.strictEqual(mDirection({ S: 1 }).dir, 'up');
  assert.strictEqual(mDirection({ D: 1 }).dir, 'down');
  assert.strictEqual(mDirection({ H: 1 }).dir, 'down');
});

test('⑦ 原文 direction 的硬核对：H 越小 ⇒ M 越大（H↓ ⇒ up）', () => {
  // law.mjs CORE_FORMULA.semantics.direction: 'Smaller H → larger M'
  assert.strictEqual(mDirection({ H: -1 }).dir, 'up', 'H 减小时 M 必须变大 —— 这是原文写死的方向');
  assert.strictEqual(mDirection({ H: +1 }).dir, 'down');
});

test('⑧ 多项同向可判；多项异向判不出（定性关系的上限，不是缺口）', () => {
  // 分子增 + 分母减 ⇒ 都是让 M 变大
  assert.strictEqual(mDirection({ R: 1, S: 1, D: -1 }).dir, 'up');
  // 分子与分母同时增 ⇒ 判不出
  const mixed = mDirection({ R: 1, D: 1 });
  assert.strictEqual(mixed.ok, false);
  assert.strictEqual(mixed.reason, 'indeterminate');
  assert.ok(/不赋值|上限/.test(mixed.detail), '必须说清这是定性上限，不是我没算');
});

test('⑨ 反证：H 的符号翻成 +1 ⇒ ⑦ 必须红（证明这条锁有效）', () => {
  // 不改源码，用等价断言验证「若符号错，方向会反过来」
  const asIfWrong = mDirection({ H: +1 });
  assert.notStrictEqual(asIfWrong.dir, 'up', '若 H↑ 也判 up，说明符号错了');
  assert.strictEqual(asIfWrong.dir, 'down');
});

test('⑩ 🔴 绝不输出 M 的数值（原文明令：不赋值、不做具体数值计算）', () => {
  for (const d of [{ R: 1 }, { H: -1 }, { R: 1, S: 1 }]) {
    const r = mDirection(d);
    assert.strictEqual('value' in r, false, 'M 不得有 value 字段');
    assert.strictEqual('m' in r, false, 'M 不得有 m 字段');
    assert.strictEqual('score' in r, false, 'M 不得有 score 字段');
    assert.ok(r.dir === 'up' || r.dir === 'down', '方向必须是枚举，不是数');
    assert.strictEqual(typeof r.dir, 'string');
  }
  // 反证：若返回里出现任何数值型结论字段，下面这条会红
  const r = mDirection({ R: 1 });
  const numericKeys = Object.entries(r).filter(([, v]) => typeof v === 'number');
  assert.deepStrictEqual(numericKeys, [], `出现了数值字段：${JSON.stringify(numericKeys)}`);
});

test('⑪ 不接受幅度（定性式只认 -1/0/+1）', () => {
  const r = mDirection({ R: 0.5 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'bad_delta');
  assert.strictEqual(mDirection({}).reason, 'no_change');
});

// ═══════════════════════════════════════════════════════════════════
// ③ 双层：微观服从宏观
// ═══════════════════════════════════════════════════════════════════
test('⑫ 宏观微观同向 ⇒ 一致；冲突 ⇒ 上行走宏观', () => {
  const same = mTwoLayer({ R: 1 }, { S: 1 });
  assert.strictEqual(same.ok, true);
  assert.strictEqual(same.conflict, false);
  assert.strictEqual(same.dir, 'up');

  const clash = mTwoLayer({ R: 1 }, { D: 1 }); // 宏观 up，微观 down
  assert.strictEqual(clash.conflict, true);
  assert.strictEqual(clash.dir, 'up', '冲突时取宏观（低层服从高层）');
  assert.ok(/上行/.test(clash.verdict));
});

test('⑬ 宏观判不出 ⇒ 微观不得越位定调', () => {
  const r = mTwoLayer({ R: 1, D: 1 }, { S: 1 }); // 宏观本身 indeterminate
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'macro_indeterminate');
  assert.ok(/不许微观越位/.test(r.verdict));
});

// ═══════════════════════════════════════════════════════════════════
// ④ `↔` 的定性：**不是算子**，是 H 内部嵌套的位置标记（安 2026-10-20 裁定）
//
// 🔴 上一版这格断言的是「status==='operator_undefined' ＋ 列清候选」，
//    那是**把错结论锁成了判据** —— 锁住的是「我找不到」，不是「它对」。
//    裁定后整格翻转：锁「它不是算子」＋「不许被实现成算子」。
// ═══════════════════════════════════════════════════════════════════
test('⑭ `↔` 不是算子 ⇒ status 必须为 not_an_operator，且标明它属于 H 内部嵌套', () => {
  assert.strictEqual(M_CONSTRAINT.status, 'not_an_operator', '裁定后不得再登记为 operator_undefined');
  assert.ok(/滑轨|滑块/.test(M_CONSTRAINT.reading), '必须说明它是 H 内部那条滑轨（原文 law.mjs:60 的「滑块」）');
  assert.ok(/law\.mjs:60/.test(M_CONSTRAINT.binds), '必须回指原文依据');
  // 裁定不许被抹掉：旧结论保留在 retracted 里，供追溯
  assert.strictEqual(M_CONSTRAINT.retracted.oldStatus, 'operator_undefined');
  assert.ok(M_CONSTRAINT.retracted.lesson.length > 10, '必须留下「类别错」这条教训');
});

test('⑳ 禁止为 `↔` 实现任何二元算子 —— M_CONSTRAINT 本体不得含任何数值', () => {
  // 🔴 结构判据（不枚举名字）：只要这个对象里出现 number 类型，
  //    就说明有人把它当可求值的东西在写（上限、比值、距离都算）。
  const nums = [];
  const walk = (o, path) => {
    if (o === null || o === undefined) return;
    if (typeof o === 'number') { nums.push(path); return; }
    if (typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(M_CONSTRAINT, '');
  assert.deepStrictEqual(nums, [], `M_CONSTRAINT 不得含数值，实测出现：${nums.join(', ')}`);

  // 反向：guards 必须显式禁掉三类实现（比值 / 距离 / 互馈）
  const g = M_CONSTRAINT.guards.join('\n');
  assert.ok(/禁止.*二元函数/.test(g), 'guards 须显式禁止实现二元函数');
  assert.ok(/ratio|distance|mutual/.test(g), '须点名被禁的候选族，否则「禁」太笼统');

  // 🔴 [12:0x 自我修正] 精确版：
  //   禁的是「把 ↔ 当运算符」，**不是**「求区间长度」。
  //   上一版锁成「禁止求值成一个数」＝ 过宽 ⇒ 会把「张力 L」这个正解一起锁掉。
  assert.ok(/禁止把 `↔` 当运算符/.test(g), '须精确到「禁运算符」而非「禁一切求值」');
  assert.ok(/允许求区间长度/.test(g), '须显式放行「区间长度（张力 L）」这个正解，否则判据过宽');

  // 自我修正必须留痕（删了就变成「我一直都对」）
  const sc = M_CONSTRAINT.selfCorrection;
  assert.ok(sc && /过宽/.test(sc.why), '自我修正须登记，并写明「过宽」这个病名');
});

test('㉑ `0 < H/(S↔D) < R` 只能挂在 outer H 上，不得挂 inner H', () => {
  // 依据 law.mjs 的 dualIdentity：约束式写在 outer.desc 里。
  // inner 是不可读的黑箱，把约束挂上去 = 要求审计不可审计之物。
  //
  // 🔴 [2026-10-21 中英对齐] 判据改锚**代码标识符**（inner: / outer: 属性名），不再锚 label 文案。
  //   原来锚的是中文 label（'向外 H（可观测行为）'），英文仓跑这条必然失效 ——
  //   这是「判据读词形而不读结构」的复发，只是这回词形伪装成了自然语言：
  //   同一个结构，两仓的品牌文案各说各话，属性名却同构 ⇒ 该锚属性名。
  const src = readFileSync(LAW, 'utf8');
  const dIdx = src.indexOf('dualIdentity: {');
  assert.ok(dIdx > 0, 'law.mjs 里找不到 dualIdentity —— 本测试的前提失效');
  const innerIdx = src.indexOf('inner: {', dIdx);
  const outerIdx = src.indexOf('outer: {', dIdx);
  assert.ok(
    innerIdx > dIdx && outerIdx > innerIdx,
    'law.mjs 的 dualIdentity 两半都得在（inner: 与 outer: 属性名，且 inner 在前、outer 在后）'
  );

  const constraintIdx = src.indexOf('0 < H / (S↔D) < R', dIdx);
  assert.ok(constraintIdx > 0, 'law.mjs 里找不到约束式，本测试的前提失效');
  // 落在 outer 描述里（inner 段在前，outer 段在后）
  assert.ok(constraintIdx > outerIdx, '约束式须在 outer H 的描述内');
});

test('㉒ mConstraintShape 只判形态：恒 numeric:false，且返回值绝不含数值字段', () => {
  const cases = ['inside', 'at_s', 'at_d', 'beyond', 'garbage', undefined];
  for (const pos of cases) {
    const r = mConstraintShape({ pos });
    assert.strictEqual(r.numeric, false, `${pos}: 不得声明数值`);
    for (const v of Object.values(r)) {
      assert.notStrictEqual(typeof v, 'number', `${pos}: 返回值出现了数值 ⇒ 违反「不赋值」`);
    }
  }
  // 三态真值方向
  assert.strictEqual(mConstraintShape({ pos: 'inside' }).ok, true);
  assert.strictEqual(mConstraintShape({ pos: 'at_s' }).state, 'off_low', '贴死 S 端 ⇒ 相对位置=0 ⇒ 违反 0<');
  assert.strictEqual(mConstraintShape({ pos: 'beyond' }).state, 'off_high');
  // 🔴 缺数据 ≠ 通过
  assert.strictEqual(mConstraintShape({}).ok, false);
  assert.strictEqual(mConstraintShape({}).state, 'unknown');
});

test('㉓ H 必须显式声明内部嵌套（innerAxis），并锁死「外层 S/D ≠ 内层 S/D」', () => {
  const h = NESTED_VARS.H;
  assert.ok(h.innerAxis, 'H 缺 innerAxis：安已裁定 ↔ 属于 H 的内部嵌套');
  assert.strictEqual(h.innerAxis.isOperator, false);
  assert.ok(/S ↔ D|S↔D/.test(h.innerAxis.rail), 'innerAxis.rail 须写明滑轨两端');
  assert.ok(/不得跨层代入/.test(h.innerAxis.warn), '须锁死跨层代入');

  // 🔴 结构判据：H 内部嵌套必须闭合在「H_in ＝ H_out」上。
  //    若不闭合（内层再长出一个新第一视角）⇒ 嵌套永不终止 ⇒ H 失去「嵌套锚」资格。
  const f = h.innerAxis.innerFour;
  assert.ok(f, 'innerFour 缺失：H 内部也该是完整一层（R_in/S_in/D_in/H_in）');
  assert.ok(/H_out/.test(f.H_in), 'H_in 必须显式说明「等于 H_out」（自指），否则嵌套不终止');
  assert.ok(/自我约束/.test(f.consequence), '须写明该约束是自我约束（观察者＝被观察者），这是它不可数值化的结构原因');
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ 域表补上宏观维（不再平铺）
// ═══════════════════════════════════════════════════════════════════
test('⑮ 每条域常数都能回指到一个宏观族（孤儿条款 = 定域被跳过）', () => {
  for (const k of Object.keys(R_CAPACITY)) {
    assert.ok(familyOf(k), `${k} 回指不到域族 ⇒ 宏观定域这一步被跳过了`);
    // ⚠️ unspecified 是占位族，宏观形态就是「未指定域」（4 字），本来就该短 ⇒ 排除阈值检查。
    //    但它的 binds 必须写明「不得借用任何族常数」，见 ⑮-补。
    if (k !== 'unspecified') assert.ok(familyMacro(k).length > 8, `${k} 的族宏观形态过短：${familyMacro(k)}`);
  }
  assert.ok(/不得借用/.test(R_DOMAIN_FAMILIES.unspecified.binds), 'unspecified 必须禁止借常数');
  assert.strictEqual(rCapAudit().verdict, 'pass');
});

test('⑯ 反证：塞一条孤儿条款 ⇒ 体检红（证明⑮不是摆设）', () => {
  const orphan = { 'ghost.no_family': { kind: 'rate', value: 1e-9, unit: 'per_hour', source: '某标准', verified: 'secondary' } };
  const a = rCapAudit(orphan);
  assert.strictEqual(a.verdict, 'fail');
  assert.ok(a.rows[0].missing.some((m) => /family/.test(m)), '缺的必须是 family');
});

test('⑰ 医疗族必须声明「走 |S_dev|>tol，不走 ΣS>R₀」', () => {
  const med = R_DOMAIN_FAMILIES.medical;
  assert.ok(/S_dev|物理量容差/.test(med.binds), '医疗族是连续量容差，必须显式声明换公式');
  assert.strictEqual(med.members.length, 5);
});

test('⑱ nestStop 判「这一层该长什么样」', () => {
  assert.strictEqual(nestStop('R', NEST.MACRO).ok, true);
  assert.strictEqual(nestStop('R', NEST.MICRO).ok, true);
  assert.strictEqual(nestStop('R', 'nano').ok, false);
  assert.strictEqual(nestStop('X', NEST.MICRO).ok, false);
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ 工具面必须真接上（「写了 ≠ 生效」）
// ═══════════════════════════════════════════════════════════════════
test('⑲ query_nested 工具已注册且 import 真被使用', () => {
  const src = readFileSync(INDEX, 'utf8');
  assert.ok(/name:\s*'query_nested'/.test(src), '工具没注册');
  assert.ok(/from '\.\/core\/nested\.mjs'/.test(src), 'nested.mjs 没 import');
  // 反向：import 了却不用 ＝ 死引用
  for (const fn of ['mDirection', 'mTwoLayer', 'mConstraintShape', 'nestAudit', 'NESTED_VARS', 'M_CONSTRAINT']) {
    assert.ok(new RegExp(`${fn}\\s*\\(|${fn}\\b`).test(src), `${fn} import 了但没被用`);
  }
  // 🔴 反证：工具描述里必须写明「不给数值」，否则调用方会以为能拿到 M
  assert.ok(/绝不输出数值|不输出数值/.test(src), '工具描述没声明「不赋值」这条硬边界');

  // 🔴 [本轮补] 状态改了、注解必须跟上 —— 这正是我被抓过两次的「半真」。
  //    裁定后工具描述里**不许再出现**「未定义算子」这类旧定性。
  const start = src.indexOf("name: 'query_nested'");
  // ⚠️ 边界必须包住 execute（它在 output 之后）。用 `}));` 收尾，不能用 `output: { schema` ——
  //    第一版就是截到 output，把 execute 切掉了，导致「args.hPosition 不存在」误报。
  const end = src.indexOf('}));', start);
  assert.ok(start > 0 && end > start, '找不到 query_nested 的完整定义块，本测试前提失效');
  const block = src.slice(start, end);
  const desc = block.slice(0, block.indexOf('parameters:'));
  assert.ok(!/未定义算子|未定义的算子/.test(desc), '工具描述仍在说「未定义算子」⇒ 旧定性残留');
  // 🔴 [2026-10-21 中英对齐] 判据从「中文短语」放宽为「中英任一」：
  //    要求是"描述必须显式声明 ↔ 不是算子"这个**语义**，不是"必须用中文这六个字"。
  //    锚中文 ⇒ 英文仓的描述（"`↔` is NOT an operator"）被判成缺失，
  //    而它其实已经说了同一件事 —— 那是尺子错，不是内容错。
  assert.ok(
    /不是算子|not an operator/i.test(desc),
    '工具描述须显式声明 ↔ 不是算子（中英任一即可）'
  );

  // 🔴 锁「参数真注册」，不是锁「字符串出现过」——
  //    上一版就只查 src 含 'hPosition'，结果把参数改名成 _removed（execute 里 args.hPosition 还在）
  //    照样全绿 ⇒ 是条假锁。现在必须在 parameters 块内命中键名。
  assert.ok(/parameters:\s*\{[\s\S]*?hPosition:\s*\{/.test(block), 'hPosition 未在 query_nested 的 parameters 里注册');
  assert.ok(/args\.hPosition/.test(block), 'hPosition 参数注册了但 execute 没读');
});

test('㉔ 运行时：真 apply ＋ 真 execute（静态锁抓不到「代码在场但被禁用」）', async () => {
  // 🔴 为什么需要这条：⑲ 是静态锁，只能证明「代码里写着」。
  //    实测过一次反例 —— 把 execute 分支改成 `if (false)`，`args.hPosition` 字面仍在，
  //    ⑲ 照样全绿。**这就是「写了 ≠ 生效」**，只有真跑一次才拦得住。
  // ⚠️ Windows 下 import() 不认 'C:\...' 字符串（ERR_UNSUPPORTED_ESM_URL_SCHEME），必须转 file URL。
  const mod = await import(pathToFileURL(INDEX).href);
  const tools = [];
  const ctx = { on() {}, tools: { register: (t) => tools.push(t) } };
  await mod.apply(ctx);

  const qt = tools.find((t) => t.name === 'query_nested');
  assert.ok(qt, 'apply 之后 query_nested 未注册（工具面第 10 个丢了）');

  const atS = await qt.execute({ hPosition: 'at_s' });
  assert.ok(atS.constraintShape, 'hPosition 传了但 execute 没返回形态 ⇒ 写了没生效');
  assert.strictEqual(atS.constraintShape.state, 'off_low');
  assert.strictEqual(atS.constraintShape.ok, false);

  const inside = await qt.execute({ hPosition: 'inside' });
  assert.strictEqual(inside.constraintShape.ok, true);

  // 不传 ⇒ 不得凭空给一个「通过」
  const none = await qt.execute({});
  assert.strictEqual(none.constraintShape, undefined, '未传 hPosition 却返回了形态 ⇒ 默认放行');
  // 但静态结构必须照常回（只读面不能被形态判定绑架）
  assert.ok(none.constraint, 'constraint 结构读数丢了');
});
