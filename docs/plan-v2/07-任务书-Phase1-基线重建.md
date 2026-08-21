# 07 · 任务书 — Phase 1：基线重建（re-anchor）

> 本 Phase 是整个重组的关键路径。执行角色 GIT（主）+ ARCH（T1.2 裁决）+ QA（T1.4）。
> 记号：`BASE` = 官方基线 tag `dsh-v0.1.0-rc.8`；`OLD` = `archive/our-base-v1`（旧开发线顶端 7fc874ca48）。所有命令在 `G:/000Github/DSH/Fork`（Git Bash）执行。

---

## T1.1 构建产物出库与忽略规则恢复（GIT，S）

**目标**：新基线不含构建产物；EOL 治理交给官方 `.gitattributes`。

**步骤**：
1. 先建 our/v2 骨架（本任务与 T1.3 前半合并执行）：
   ```bash
   git fetch upstream --tags --prune
   git checkout -b our/v2 upstream/master
   git config core.autocrlf false          # 03 §7：EOL 交给 .gitattributes
   ```
2. 核验基线自带治理文件：`ls .gitignore .gitattributes .editorconfig`（upstream/master 自带）。
3. 对比官方是否跟踪构建产物：`git ls-files | grep -cE '/lib/|\.tsbuildinfo'` —— 记录该数字 N₀（预期 0）。这就是 our/v2 的卫生基线。

**验收**：our/v2 存在且 `git merge-base our/v2 upstream/master` 输出 upstream/master 的 hash；三个治理文件存在；N₀ 已记录。**禁止**：向 our/v2 提交任何 `lib/`、`*.map`、`*.tsbuildinfo`、`_tmp_*`。

## T1.2 本地增量三清单提取与裁决（ARCH，M）

**目标**：把"our/base 相对官方 rc.8 的真实本地增量"提炼成三张带裁决标记的清单。这是移植的完整输入，宁可多列不可漏列。

**步骤**：
```bash
mkdir -p ../Plan/artifacts
git ls-tree -r --name-only $BASE | sort > ../Plan/artifacts/base.files
git ls-tree -r --name-only $OLD  | sort > ../Plan/artifacts/old.files
comm -13 ../Plan/artifacts/base.files ../Plan/artifacts/old.files > ../Plan/artifacts/add.raw   # 本地新增
comm -23 ../Plan/artifacts/base.files ../Plan/artifacts/old.files > ../Plan/artifacts/del.raw   # 本地删除
# 真实修改（忽略 EOL 与重命名；排除构建产物）：
git diff --ignore-cr-at-eol -M100% --numstat $BASE $OLD -- \
  ':(exclude,glob)**/lib/**' ':(exclude,glob)**/*.map' ':(exclude,glob)**/*.tsbuildinfo' \
  | awk '$1!=0 || $2!=0 {print $3}' > ../Plan/artifacts/mod.raw
```
（Git Bash 下 `$BASE`/`$OLD` 先赋值：`BASE=dsh-v0.1.0-rc.8; OLD=archive/our-base-v1`。）

**裁决规则**（逐条给 add.raw / mod.raw 标记，产出入 `Plan/artifacts/adjudication.md`）：

add.raw 的默认标记与例外：
| 类别 | 标记 | 说明 |
|---|---|---|
| `packages/plugins/**`（源码+测试） | **adopt** | T2.1 正式化时重组 |
| `packages/client/ui-plugin-manager/**` | **adopt** | T2.6 接线 |
| 安全修复类新增源文件：`packages/core/hooks/src/permission.ts`、`packages/credentials/credentials/src/encrypted-provider.ts`、`packages/session/session-persistence/src/credential-obfuscation.ts`、`packages/core/system-prompt/src/locked-sections.ts`、`packages/compaction/compaction-progressive/**`、`packages/settings/settings-audit*/**`、`packages/llm/llm/src/constants.ts`、`packages/client/runtime/src/env.d.ts` | **adopt**（标注：T2.7 复核） | 落入官方既有包内的新文件**可能编译失败**——T1.3 按"先试编译，失败则暂缓进 `Plan/artifacts/deferred.list`"处理 |
| `packages/memory/**` | **drop** | D8/backlog-001 |
| `planning/**`、`CHANGELOG-v2..v5/final.md`、`DELIVERY.md`、`FINAL-DELIVERY-REPORT.md`、重写版 `README.md/README.zh.md` | **drop** | D8 取代（T4.x 另建 docs/dsh） |
| `.github/workflows/plugin-compat.yml` | **drop** | 坏 CI，T3.1 重写 |
| `scripts/setup-base-branch.sh`、`scripts/sync-with-official.sh`、`scripts/check-transplant.sh`、`scripts/start-all-modules.sh` | **review** | 与 03 §4 SOP 对齐后决定去改；`diff-with-official.sh` 思路由 T3.4 以 `.mjs` 重写 |
| `_tmp_*`、`**/lib/**`、`*.map`、`*.tsbuildinfo`、其余文档/杂项 | **drop** | junk |

mod.raw 的裁决（预期很短，逐文件人工过目 diff）：
| 文件 | 预裁 | 依据 |
|---|---|---|
| `packages/core/session/src/index.ts`（DeriveMessagesOptions 模块级化） | adopt | 小而独立 |
| `packages/core/tools/src/index.ts`（maxResultBytes） | adopt（T2.7 复核官方是否已有等价物） | 安全价值 |
| `packages/session/session-stats/src/projection.ts`（inputTokens） | adopt | |
| 根 `package.json` | **review**：以 upstream 0.1.1 版为底，仅回加 DSH 需要的 scripts（如有）；版本号交给 T5.1 | 避免整体回退官方演进 |
| `apps/web/index.html`（lang=zh-CN） | **drop** | i18n 运行时切换，硬编码不当 |
| `AGENTS.md`（3 行） | review（倾向 drop，差异挪 docs/dsh） | 官方文件，尽量零改动 |
| `README.md/README.zh.md` | drop（T4.3 按官方模板加附录） | D8 |
| `assets/*.png`、二进制/纯 mode 变化 | drop | 噪音 |

del.raw：**全部 drop**（即恢复官方原样——从 upstream 切出天然恢复）。唯一例外流程：若 ARCH 认为某删除是有意为之（目前证据均指向快照过程误删），需单独说明并经 ORCH 批准。

**验收**：`Plan/artifacts/` 下有 add.list / mod.list / del.list（含标记列）+ adjudication.md（每个 review/drop 一句话理由）；add.list 中 adopt 项逐一可 `git cat-file -e OLD:<path>` 验证存在。

## T1.3 our/v2 创建与补丁移植（GIT+ARCH，L）

**目标**：把裁决为 adopt 的内容落到 our/v2，形成可审阅的提交序列。

**步骤**：
```bash
git checkout our/v2
# 1) 新增：整路径检出（分主题提交）
#    commit A：治理体系
git checkout $OLD -- packages/plugins/ packages/client/ui-plugin-manager/
git add -A packages/plugins packages/client/ui-plugin-manager && git commit -m "feat(plugins): import plugin governance sources from our-base-v1 (unwired, formalized in T2.1)"
#    commit B：安全修复源文件（逐路径，来自 add.list 的安全类 adopt 项）
git checkout $OLD -- <安全类路径...> && git commit -m "feat(security): import security-fix sources from our-base-v1 (unwired, reviewed in T2.7)"
# 2) 修改：逐文件三方应用
while IFS= read -r f; do
  git diff --ignore-cr-at-eol $BASE $OLD -- "$f"
done < <(grep adopt mod.list | cut -f1) > ../Plan/artifacts/local-mods.patch
git apply -3 --ignore-whitespace ../Plan/artifacts/local-mods.patch
#    冲突文件逐个按 03 §2.2 优先级裁决，裁决过程写入 adjudication.md §冲突
git add -A && git commit -m "feat: port local source modifications onto 0.1.1-rc.2 baseline"
```
**编译试探规则**：每完成一个 commit 跑 `pnpm install && pnpm build`；若官方包内新增文件（commit B 类）导致该包编译失败：把该文件从提交中移出、路径记入 `deferred.list`（T2.7 处理），不得为编译通过而修改官方包的构建配置。

**重点冲突区提示**（官方 0.1.1 改动热区 × 本地改动）：
- `credentials/**`（官方 33 文件重做 vs 本地 encrypted-provider）：**最大风险**，diff 官方新实现，若官方已提供等价加密存储则本地文件转 drop 并记 `adopted upstream <hash>`；
- `packages/core/session`、`core/tools`：官方有改动，预计小冲突；
- `packages/llm/*`（官方 llm/llm-deepseek/token-meter 大改 vs 本地 constants.ts）；
- 根 `package.json`。

**验收**：our/v2 上提交序列清晰（A/B/C 分主题，无混合提交）；`git status` 干净；`pnpm build` 通过（或 deferred.list 有据）；adjudication.md 含冲突裁决记录；`git merge-base our/v2 upstream/master` 仍为 upstream/master。

## T1.4 官方基线门禁验证（QA，M）

**目标**：证明新基线的质量底线 = 官方本身的底线。

**步骤**：
1. 环境对齐：按根 `package.json` 的 `engines`/`packageManager` 安装对应 Node/pnpm 版本（Windows）。
2. 依次执行并记录输出：`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm lint`、`pnpm check:all`（若全量门在 Windows 不可行，执行 `scripts/run-gates.ts` 的 windows-blocking 子集，对照官方 CI 的 Windows job）。
3. 失败分诊：官方代码在我们环境的失败（环境性）→ 记录证据并与官方 Actions 近期结果对照；本地移植引入的失败 → 退回 T1.3 修复。
4. 产物：`Plan/logs/TASK-T1.4.md` 附每条命令的结尾输出（通过数/失败数）。

**验收**：typecheck/build/test 全绿（环境性豁免须有官方 CI 对照证据）；STATE.md 记录门禁基线快照。

## T1.5 master 镜像与远程布局落地（GIT，S，含用户决策点）

**目标**：远程仓库布局进入 03 §1.2 终态。

**步骤（默认方案 B）**：
1. `git push -u origin our/v2`。
2. 请用户在 GitHub 仓库 `Settings → Branches` 把默认分支切到 `our/v2`（或用 `gh api -X PATCH repos/zsagi1368/deepseek-harness-DSH -f default_branch=our/v2`，需用户授权）。
3. 方案 A（force push 重建 master 为官方历史）**仅在用户明确批准**后按 03 §2.3 执行（先推 archive/old-master-snapshot 保底）。

**验收**：`git ls-remote origin` 显示 our/v2；默认分支已是 our/v2（或方案 A 完成）；origin/master 状态与决策记录在 STATE.md。

## 门禁 G1 验收清单（REV 执行）

- [ ] `git merge-base our/v2 upstream/master` == upstream/master（真实祖先成立）
- [ ] `git ls-files | grep -cE '/lib/|\.tsbuildinfo'` ≤ 官方同口径数字 N₀（差值=0）
- [ ] T1.4 门禁全绿或环境性豁免有据
- [ ] adjudication.md 完整（add/mod/del 三清单一一有裁决）；deferred.list（如有）已登记进 T2.7
- [ ] our/v2 已推送；无任何 PAT/垃圾文件；STATE.md 更新
