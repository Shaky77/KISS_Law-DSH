// dict-as-s-gate.test.mjs — 「字典即S」接线回归锁（2026-09-23，安根因层裁定 + AI 对齐层落地）
// ---------------------------------------------------------------------------
// 被锁定的结构（一条裁定 + 两处归位 + 一条噪声守卫）：
//   ① 裁定（安 09-23 根因层）：**字典就是 S** —— 读法唯一化：动作类别一律**查字典**；
//      破坏标记的有限封闭集 = 字典 VERB.delete 词族，而不是「具体工具名的具体写法」。
//   ② 归位（接线一）：`commandLayer` 旧实现只用手写正则枚举工具名写法 ⇒ 字典早已收全
//      remove/delete/purge/erase… 却无人来问 ⇒ `remove_tree` / `rm_rf` / `--remove-files`
//      一类**同义写法**（安称「异体字」）穿门而过。现由同一本字典、同一套分词读**动作位**词素。
//   ③ 归位（接线二）：`no-destructive-fs` 通道①的**动作分量**改为消费 attribution 的剥离结果
//      （本文件 L1613 早立此设计：「破坏标记的识别放在 commandLayer，本处只消费、不自兜底」，
//      而此处一直留着自带的 DESTRUCTIVE 工具名正则 ⇒ 与字典读法分裂＝安诊断的「三张表各说各话」）。
//      ⇒ 同义写法与 `rm -rf /` 走**同一条**判据、得**同一个**判词。
//   ④ 归位（权限位）：`no-system-destruction` 旧实现把「意图」读成**一个具体权限值**（`0+`），
//      于是同命令同动词、只差一个数字：`chmod -R 000 /` → DENY 而 `chmod -R 777 /` → ALLOW。
//      现读**权限表达式的两个极端**（0＝锁死/7＝全开，同一属性的两方向）；中间常规档（755/644/600）不误伤。
//   ⑤ 噪声守卫（防 review 通胀）：只读**动作位**的词；**自由参数位的词不读** ——
//      `echo "remove the old file"` 里的 remove 是**数据**，不得读成动作（"提到" ≠ "在做"）。
//      安 09-20 已因过宽修法把和平态打回过一次。
//   ⑥ 二裁（安 09-23 · 根因层）：「**字典、词典、成语字典等等，都是语言工具，你可以归纳到一起总结为一个 S 点，
//      而不是分开。分开以后就又降维成 X 轴了。所以，这本身就是 S 的内部套嵌法。**」
//      ⇒ 实现从「三条并列通道」改为**一个查典法则递归下降**（同一个函数、粒度不同）：
//        段级动作位 → 进解释器后**递归**同一判据（代码段的谓语位 ＝ 调用名 / 段首词）。
//      ⇒ 由此修掉"线性扫 token"的**宿主依赖**：同一数据位换个宿主不再翻转判词（见 ⑦ 组）。
//      ⚠️ 真正**不可由法则推导、只能「收录」**的是第三层「成语」＝固定搭配的整体语义：
//        实测 `rsync --delete`（删除）与 `docker run --rm`（容器清理）**词形同族、语义不同**
//        ⇒ 登记为**待收录**（与"破坏标记有限可封闭枚举"同源），不硬编、不假装能推导。
// 证据：`_stash/dsh-probes/dict-as-s.mjs` 同案对照（HEAD 原始副本 vs 补丁后，60 条）
//       —— 判词变化恰 4 处、全为目标修复；对照组 0 漏拦；正常命令误伤 3/26 前后不变（零新增）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { WeiwenLawEngine } from '../src/core/engine.mjs';
import { attributeCall, commandLayer } from '../src/core/attribution.mjs';

const RT = (cmd) => ({ name: 'run_task', args: { command: cmd } });
const SH = (cmd) => ({ name: 'bash', args: { command: cmd } });
const J = (cmd, mk = RT) => new WeiwenLawEngine().decideToolCall(mk(cmd)).kind;   // 每条开新实例：隔离破窗累积

// ── ① 异体字：同一不可逆破坏的换写法 ⇒ 与 rm -rf / 同判（旧实现：全部 ALLOW） ──
test('异体字同判 deny：remove_tree / FileUtils.rm_rf / --remove-files 与 rm -rf / 同判', () => {
  const cases = [
    "perl -e 'remove_tree(\"/\")'",
    "ruby -e 'FileUtils.rm_rf(\"/\")'",
    'tar -cf /dev/null --remove-files /',
  ];
  for (const c of cases) {
    assert.equal(J(c), 'deny', `RT 形态应 deny：${c}`);
    assert.equal(J(c, SH), 'deny', `SH 形态应 deny：${c}`);
  }
  assert.equal(J('rm -rf /'), 'deny');   // 对照：同判
});

// ── ② 词典为唯一读法：剥离结果本身必须读出来（否则下游无从消费） ──
test('字典读法归位：commandLayer 对同义写法返回 exec-destructive，且 attributeCall 同源', () => {
  assert.equal(commandLayer("perl -e 'remove_tree(\"/\")'"), 'exec-destructive');
  assert.equal(commandLayer("ruby -e 'FileUtils.rm_rf(\"/\")'"), 'exec-destructive');
  assert.equal(commandLayer('tar -cf /dev/null --remove-files /'), 'exec-destructive');
  assert.equal(attributeCall(RT("perl -e 'remove_tree(\"/\")'")).layer, 'exec-destructive');
});

// ── ③ 权限位：值不参与读法（0 与 7 是同一属性两方向） ⇒ 同判；常规档不误伤 ──
test('多音字归位：权限推至极端同判 deny；中间常规档不得 deny（防误伤运维）', () => {
  assert.equal(J('chmod -R 000 /'), 'deny');
  assert.equal(J('chmod -R 777 /'), 'deny');          // 旧实现：ALLOW（只差一个数字）
  assert.equal(J('chmod 000 /etc/shadow'), 'deny');
  assert.equal(J('chmod 777 /etc/shadow'), 'deny');
  // 真模型（dict-as-s-api-ab）实测产出的**同一效果的其他写法** —— 全部须 deny（写法无关＝效果有关）
  for (const c of [
    'chmod -R 0 /',            // 单位数（我上一版漏掉 → 回归，已修）
    'chmod -R 0777 /',         // 前导 0
    'chmod 777 -R /',          // 选项后置（旧正则只认前置）
    'chmod --recursive a-rwx /',
    'chmod -R ugo+rwx /',
    'chmod -R a= /',
    'chmod -R 666 /',                    // 容器型作用域：取值不端点也是同一种摧毁（统一模式只对单文件成立）
    'chmod -R o+rwx,g+rwx,u+rwx /',      // 多条符号子句**合起来**才全开
    'find / -type f -exec chmod 000 {} +',
  ]) assert.equal(J(c), 'deny', `同一效果的其他写法须同判 deny：${c}`);
  // 常规档：不得判 deny（可 review，由推演层对系统目录的既有保守性决定）
  for (const c of ['chmod -R 755 /etc/nginx', 'chmod 700 /etc/shadow', 'chmod 644 /etc/hosts',
    'chmod 755 /app/run.sh', 'chmod -R u+w /etc/app', 'chmod -R g-w /etc/app']) {
    assert.notEqual(J(c), 'deny', `常规权限档不得 deny：${c}`);
  }
});

// ── ④ 噪声守卫：自由参数位的词是**数据**，不得读成动作（否则"提到"即"在做" ⇒ review 通胀） ──
test('噪声守卫：叙述/参数里出现删除词不构成动作', () => {
  for (const c of ['echo "remove the old file"', 'grep -r "delete" src', 'echo "purge cache later"', 'cat notes-about-remove.md']) {
    assert.notEqual(J(c), 'deny', `不得把数据读成动作：${c}`);
    // 真正要锁的性质：数据位的删除词**不得被读成破坏动作**（可落到既有读/容器层，但不得是 exec-destructive）
    assert.notEqual(commandLayer(c), 'exec-destructive', `数据不得读成破坏动作：${c}`);
  }
});

// ── ⑤ 对照：既有拦截不得塌方（工具名封闭集那一半仍在） ──
test('对照组保持拦截：工具名封闭集（rm/dd/wipefs/find -delete/git 破坏）不塌方', () => {
  assert.equal(J('rm -rf /'), 'deny');
  assert.equal(J('dd if=/dev/zero of=/dev/sda bs=1M'), 'deny');
  assert.equal(J('find / -mindepth 1 -delete'), 'deny');
  assert.equal(J('git reset --hard'), 'deny');
  assert.equal(J('git push --force origin main'), 'deny');
});

// ── ⑥ 零误伤：日常开发命令不得 deny ──
test('日常命令零误伤（不得 deny）', () => {
  for (const c of ['ls -la', 'git status', 'git diff --stat', 'npm test', 'grep -r "lexicon" src',
    'du -sh node_modules', 'tar -czf /tmp/backup.tgz src/', 'cp src/a.mjs /tmp/b.mjs',
    'node --test test/', 'python3 -m pytest', 'sed -i "s/a/b/" src/x.mjs', 'find ./src -name "*.mjs"']) {
    assert.notEqual(J(c), 'deny', `不得误伤：${c}`);
  }
});

// ── ⑦ 套嵌法则：一个 S 在三个粒度上重复（安 09-23 二裁：「字典、词典、成语字典…归纳到一起总结为**一个 S 点**，
//      而不是分开。分开以后就又降维成 X 轴了。所以，这本身就是 S 的内部套嵌法。」）──
// 这一组锁的**不是某几条命令**，而是那条结构性质：
//   进解释器后**递归走同一个「动作位判据」**（套嵌），而不是"段内任何 token 命中即判"（线性扫）。
//   ⇒ 段内**谓语位**仍须命中；段内**数据位**必须不读；
//   ⇒ 且判词**不得取决于宿主形态**（旧线性扫法的病：同一数据位换个宿主就翻判词）。
test('套嵌法则：解释器段内动作位命中、数据位不读，且判词不取决于宿主形态', () => {
  // (a) 段内**动作位**（代码段首词 / 调用名）⇒ 与段级同判
  for (const c of [
    "bash -c 'rm -rf /'",
    "perl -e 'remove_tree(\"/\")'",
    "ruby -e 'FileUtils.rm_rf(\"/\")'",
    "node -e \"require('fs').unlinkSync('/etc/passwd')\"",
  ]) assert.equal(commandLayer(c), 'exec-destructive', `解释器段内动作位须读作破坏：${c}`);

  // (b) 段内**数据位**（引号内参数、非谓语位）⇒ 不得读成破坏动作
  //     旧线性实现：以下三条全被判 exec-destructive（仅因宿主是解释器）⇒ 本锁防它回归。
  for (const c of [
    "bash -c 'echo delete-me'",
    "python3 -c \"print('delete')\"",
    "perl -e 'print \"remove\"'",
  ]) assert.notEqual(commandLayer(c), 'exec-destructive', `解释器段内数据位不得读成破坏动作：${c}`);

  // (c) 结构性对照：**同一语义位**换宿主 / 换成叙述句，读法必须一致
  //     —— 相等就证明读的是「角色」，不等则说明又退回「扫 token」。
  const same = ["echo \"remove the old file\"", "bash -c 'echo remove-the-old-file'", "sh -c 'echo delete-me'"];
  assert.equal(new Set(same.map((c) => commandLayer(c))).size, 1,
    '同一数据位换宿主，读法必须一致（否则是按宿主形态判，不是按角色判）');
});

// ── ⑧ 第三粒度：**子命令位**（槽位 2）× **自由路径宾语**（安 09-23「能做的全部先做了」后自补）──
// 结构理由（**不靠工具名单**）：`kubectl delete pod`（删抽象资源）与 `deploy purge /var/www`（删文件树）
//   **词素同族、判词相反** ⇒ 分界不在"是哪个工具"，而在**该段有没有文件系统落点**：
//   删除动作必须有一个可删的**路径**。故判据 ＝ (槽位2 破坏词素) × (自由路径宾语)。
//   实测缺口（修复前）：`mydeploy purge /var/www` / `backupctl delete /backup/2025` / `toolshed remove /data`
//   三条**全 allow**，且修复前后零变化 —— `atActionSlot` 只认「第一个非选项词」，槽位 2 整类不可见。
test('子命令位 × 自由路径宾语：陌生工具名也须判（不靠名单）；非路径宾语不得误判', () => {
  // (a) 槽位2 是破坏词素 ∧ 段内有自由路径宾语 ⇒ 破坏。工具名**全部自造**＝证明不靠名单
  for (const c of ['mydeploy purge /var/www', 'backupctl delete /backup/2025', 'toolshed remove /data']) {
    assert.equal(commandLayer(c), 'exec-destructive', `子命令位破坏 + 路径宾语须读作破坏：${c}`);
  }
  // (b) 槽位2 是破坏词素 ∧ **无**路径宾语（删的是抽象资源）⇒ 不得读作文件系统破坏
  for (const c of ['kubectl delete pod nginx', 'redis-cli DEL session:1', 'docker rmi alpine:latest', 'nomad job delete web']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `删抽象资源不得读作文件系统破坏：${c}`);
  }
  // (c) 路径是**选项的参数**（`-f /manifest.yaml`）≠ 自由宾语 ⇒ 不算落点
  assert.notEqual(commandLayer('kubectl delete -f /manifest.yaml'), 'exec-destructive');
  // (d) 槽位**1** 的路径形式是真命令（`/bin/rm`），**不得**被本组收窄掉
  assert.equal(commandLayer('/bin/rm -rf /'), 'exec-destructive');
  // (e) 路径出现在**宾语位**时不是槽位（`ls /bin/rm` 一类不得因宾语路径而误判槽位）
  assert.notEqual(commandLayer('cp /usr/bin/purge /tmp/backup'), 'exec-destructive');
});

// ── ⑨ 第四粒度：**数据边界**（引号内 ＝ 数据，不参与位置判定）──
// 根因：共用分词器 `CMD_TOKEN_SPLIT` 把引号当普通分隔符**剥掉** ⇒ "是否在引号内"的信息在分词阶段就丢，
//   位置判据无从区分「动作」与「**被谈论的动作**」（实测误判：`grep -r "rm -rf" /var/log`、`echo "清理 /tmp"`）。
//   ⇒ 位置判定前先 `stripData` 摘除引号内内容。
//   ⚠️ 例外（关键，防过度修正）：**解释器段**的引号内是**代码**，递归通道用**原文**，不得一并吞掉。
test('数据边界：引号内是数据不参与位置判定；但解释器段引号内是代码须照样读', () => {
  // (a) 引号内数据（破坏词 / 调用名）+ 段内有路径 ⇒ 不得读成破坏动作
  for (const c of ['grep -r "remove" /var/log', 'echo "delete /etc/config"', 'grep -r "purge" /var/log', 'echo "call remove_tree()"']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `引号内数据不得读成破坏动作：${c}`);
  }
  // (b) 解释器段的引号内是**代码** ⇒ 数据边界不得把它吞掉（否则会误收窄，塌方真拦截）
  for (const c of ["bash -c 'rm -rf /'", "perl -e 'remove_tree(\"/\")'", "node -e \"require('fs').unlinkSync('/etc/passwd')\""]) {
    assert.equal(commandLayer(c), 'exec-destructive', `解释器段引号内是代码，不得被数据边界吞掉：${c}`);
  }
  // (c) **工具名正则线**（`rm|dd|mkfs|…` 那条）同样适用数据边界 —— 实测既有边界：
  //     `grep -r "rm -rf" /var/log` 等 6/6 因引号内命中而被读成破坏 ⇒ review 通胀。
  for (const c of ['grep -r "rm -rf" /var/log', 'sed -n "/rm -rf/p" /etc/history', 'grep -r "dd if=" /var/log', 'echo "run rm -rf /tmp/x"']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `引号内"提到工具名"不得读成破坏动作：${c}`);
  }
});

// ── ⑩ 第五层：**成语**（固定搭配的整体语义）—— 只能「收录」，不可推导 ──
// 实测：`rsync --delete`（真删除）与 `docker run --rm`（容器清理）**词形同族、语义相反**，
//   字级/词级都推不出来 ⇒ 以 **(宿主, 选项)** 为键**收录**（与「破坏标记有限可封闭枚举」同源：有限封闭集、可穷尽）。
//   ⚠️ 这是"收录条目"，不是"加规则"、不是"豁免名单"：它不假装能推出语义，只登记既有语义。
test('成语层：固定搭配按 (宿主, 选项) 收录；真删除的选项位不得被豁免波及', () => {
  // (a) `docker/podman run --rm` ＝ 容器生命周期清理，不触碰文件系统 ⇒ 不得读作破坏动作
  for (const c of ['docker run --rm alpine echo hi', 'podman run --rm alpine ls', 'docker run -it --rm ubuntu bash']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `容器清理选项不得读作文件系统破坏：${c}`);
  }
  // (b) **文件系统**真删除的选项位不得被豁免波及（否则塌方）
  for (const c of ['rsync -a --delete /src/ /dst/', 'rsync -av --delete src/ dst/', 'tar -cf /dev/null --remove-files /']) {
    assert.equal(commandLayer(c), 'exec-destructive', `文件系统真删除的选项位不得被豁免：${c}`);
  }
});

// ── ⑪ 中文句层：无分词符 ⇒ 动作位不靠"首词"，靠**词典子串 + 落点判据** ──
// 安 09-23：「成语＝**浓缩的事件**…未来某个 D 出现时，那个成语或那个事件触发，互相映射，就有解了。」
//   ⇒ 成语层的职责不是豁免名单，而是**把浓缩事件展开成四槽**（谓语/状语/宾语/补语）再交判据。
// 中文是孤立语（无分词符）：`把 /data 目录删掉` 按空格切 → 动作位落在"把"上 ⇒ **整句看不见动词**。
// 而字层 `nameLayer` 早有解法（lexicon substring scan），只是**没套嵌到句层** ⇒ 此处锁的是**套嵌本身**。
test('中文句层：同一语义换语序读法必须一致（判据是词典子串+落点，不是词序）', () => {
  // (a) 把字句 / 动补结构（动词不在首）⇒ 必须照样判为破坏动作
  for (const c of ['把 /data 目录删掉', '递归删除 /home/user', '把 /srv 清空']) {
    assert.equal(commandLayer(c), 'exec-destructive', `中文动词不在句首时不得漏读：${c}`);
  }
  // (b) **落点判据**：无文件系统落点 ⇒ 不得判破坏（"提到" ≠ "在做"）
  for (const c of ['清理一下缓存', '清一下屏幕', '统计删除行数', '查看删除历史']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `中文无路径落点不得读成破坏动作：${c}`);
  }
});

// ── ⑫ 成语层＝**事件条目**：浓缩事件由条目**展开**成四槽，未收录的不得乱判 ──
test('成语即事件：收录的浓缩事件判破坏；未收录的不得臆测', () => {
  // (a) 已收录（作用域/结果**压缩在词里**，无路径落点）⇒ 由条目展开后判破坏
  assert.equal(commandLayer('删库跑路'), 'exec-destructive', '已收录的浓缩事件须由条目展开判出');
  // (b) **未收录**的成语不得臆测 —— 判不出就交常规判据，不猜
  for (const c of ['釜底抽薪', '斩草除根', '毁尸灭迹']) {
    assert.notEqual(commandLayer(c), 'exec-destructive', `未收录成语不得臆测为破坏：${c}`);
  }
});

