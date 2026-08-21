# 08 · 任务书 — Phase 2：能力移植与开发

> 执行角色：DEV-PLUGIN（T2.1–T2.5）、DEV-UI（T2.6）、DEV-CORE（T2.7–T2.9）。全部工作在 `our/v2` 上按 03 §1.2 的主题分支进行（`our/feat/T2-1-plugin-governance` 等），一个任务一分支。
> 通用输入：`Plan/artifacts/adjudication.md`（T1.2 裁决表）、`Plan/artifacts/stash-watcher.patch`（T0.3 留档）、官方 `AGENTS.md` 架构铁律（02 §3.3）。

---

## T2.1 治理包正式化（DEV-PLUGIN，M）

**目标**：`packages/plugins/` 从死代码变成真实 workspace 包 `@deepseek-ai/dsh-plugin-governance`。

**步骤**：
1. 结构调整：`packages/plugins/` → `packages/plugins/plugins/`，内部分 `src/`（spec/base/registry/guards/sandbox/compat/persistence，即现有 19 个源文件）与 `tests/`。
2. **模仿官方同类包建配置**：以 `packages/host/plugin-inventory`（纯 host 面小包）为模板，复制其 `package.json`/`tsconfig.json` 形态：包名 `@deepseek-ai/dsh-plugin-governance`、`private: true`（除非决定发布）、exports 指向 `lib`、scripts 与根构建对齐；peer/regular 依赖只声明真实 import 的（如官方 `@deepseek-ai/cordis`）。
3. 根构建接入：确认官方 tsconfig references 机制（读根 `tsconfig.host.json` 与模板包如何被引用）；host 面单面即可（治理逻辑全部 host 面）。
4. `pnpm install && pnpm build` 通过；`pnpm knip --treat-config-hints-as-errors` 若报未消费导出 → **允许临时把本包加入 knip 豁免并在 STATE.md 登记债务 D-KNIP-1**（T2.5 消费后必须移除）。
5. 提交：`feat(plugins): formalize plugin governance as workspace package`。

**验收**：`pnpm why @deepseek-ai/dsh-plugin-governance` 可见 workspace 解析；`pnpm build` 含本包编译产物；无 knip 告警（或有登记的临时豁免）。**禁止**：修改官方既有包的构建脚本来迁就本包；引入任何运行时大依赖。

## T2.2 治理包测试迁移与补齐（DEV-PLUGIN，M）

**目标**：测试进入官方收集 glob 并达到官方覆盖门。

**步骤**：
1. 迁移重命名：`test/integration.test.ts`→`tests/integration.spec.ts`，`spec.test.ts`→`tests/spec.spec.ts`，`security-fix-validation.test.ts`+`sandbox/security-fix.test.ts`→合并为 `tests/security.spec.ts`；修正 import 路径（相对 `../src`）。
2. 跑收集验证：`pnpm vitest run packages/plugins/plugins` 确认被根配置收集（glob `packages/*/*/tests/**/*.spec.ts`）。
3. 补齐至**单文件 100% 覆盖**（官方 per-file 门）：persistence、registry、guards 各补单测；确需豁免的行用官方同款 `/* v8 ignore ... */` 并注明原因（先 grep 官方现有用法对齐风格）。
4. 修复顺带问题：`persistence` 中 `require('rimraf')` → 改为 `node:fs` 的 `rm(path,{recursive:true,force:true})` 或官方 util（消除 CJS 调用，C-1 前置）。

**验收**：`pnpm test` 默认套件包含本包且全绿；覆盖率报告本包文件 100%（或有理由充分的 ignore 注记）；交接记录附 vitest 汇总行。

## T2.3 CordisAdapter 阶段 1（DEV-PLUGIN，L）

**目标**：官方 Cordis 插件可经 adapter 在治理体系内加载/启停（plugin-compat-analysis 路线的阶段 1）。

**步骤**：
1. 研读输入：`R&D/plugin-compat-analysis.md`（4 个 P0 与 4 阶段路线）、`vendor/loader` 插件定义形态、`examples/cordis-demo`、`apps/cli/config/agent-presets/cordis/`（官方真实插件样例）。
2. 补全 `src/compat/cordis-adapter.ts` 到阶段 1 范围：`isCordisPlugin()` 判定、ID 规范化（npm scoped → namespace/name）、默认 `OFFICIAL_SANDBOX_CONFIG` 注入、生命周期映射（install/uninstall/getHealthStatus）、审批桥接官方 `dsh-user-approval`。
3. 写集成测试 `tests/cordis-adapter.spec.ts`：用官方示例插件对象（不起完整 Loader，构造最小 Cordis entry 对象即可，参考官方 loader 测试的构造方式）验证：包装→注册→启停→健康检查→审批回调。
4. 双轨注册表：`registry` 支持注册 native PluginSpec 插件与 adapter 包装的 Cordis 插件，状态/健康统一呈现。
5. 产出文档 `docs/dsh/plugin-compat.md`（三元组）：4 个 P0 的现状、阶段 1 边界、阶段 2–4 计划（backlog-003）。

**验收**：集成测试绿；`docs/dsh/plugin-compat.md` 存在且通过文档门禁（`pnpm run verify-translation-pairing` 覆盖范围内）；adapter 无 `as any`（10 §2）。**禁止**：为绕过不兼容而修改 vendor/ 或官方插件运行时。

## T2.4 持久化统一（DEV-PLUGIN，M）

**目标**：存储行为对齐 BRANCH-INDEPENDENCE-SPEC（D6），合并 stash 遗留改动。

**步骤**：
1. `src/persistence/plugin-persistence.ts`：默认根改为 `path.join(os.homedir(), '.dsh-dsh')`；环境变量 `DSH_BRANCH_HOME` 覆盖优先；目录常量与注释全部同步（清除 `.dsh-plugins`/`DSH_PLUGINS_HOME` 旧叙述，C-2）。
2. 应用 `stash-watcher.patch` 的 watcher 改动到 `src/guards/watcher.ts`，按需适配。
3. 子目录规划写入代码注释与 `docs/dsh/`：`~/.dsh-dsh/plugins/registry.json`、`cache/`、`logs/`、`data/`。
4. 测试：默认路径/环境变量覆盖/持久化往返/并发写（atomic-write 思路可参考 `packages/util/atomic-write`）。

**验收**：单测覆盖三种路径来源（env > 默认）；grep 全仓库无 `.dsh-plugins`、`DSH_PLUGINS_HOME` 残留叙述；stash 内容已并入并有提交号。

## T2.5 host 面服务接线（DEV-PLUGIN，L）

**目标**：治理能力以官方形态暴露给客户端：新 host 包 `@deepseek-ai/dsh-plugin-governance-host`（`packages/host/plugin-governance/`）注册 Cordis service，经 `apiproxy` 暴露 Remote API。

**步骤**：
1. 模板研究：`packages/host/plugin-inventory`（host 侧如何做 Remote 投影）、`packages/host/apiproxy`（service 如何暴露）、一个官方带状态 service 的包（如 settings）。
2. 实现 service（全部经 `ctx.effect()` 注册；监听瀑布必须 `next()`）：`list/get/install/uninstall/enable/disable/health/approve/presetSave/presetLoad/presetDelete`，内部调治理包 Registry/守卫/持久化。
3. API 面（Remote 方法）加类型声明，走 typert/protocol 惯例（对照官方现有 Remote 定义方式）。
4. 移除 T2.1 的 knip 临时豁免（消费方就位），登记债务清零。
5. 按 AGENTS.md 要求写 Agent Note（`.agents/notes/implemented/`，遵循官方 notes 格式）。
6. 组合接入：把 host 包加进 `packages/bundle/base`（或 web-app 层，对齐官方组合习惯——研究后选择最小侵入层），使默认 profile 可用。

**验收**：`pnpm dsh` 启动的 profile 中 service 可用（dump-config 可见）；host 侧单测覆盖 service 方法；knip 无豁免债务；Agent Note 存在且过 lefthook 校验。

## T2.6 UI 接线（DEV-UI，L）

**目标**：`ui-plugin-manager` 真实可用：官方 Web 设置页内共存的管理区块，零 TODO 桩。

**步骤**：
1. 研究官方机制：`packages/client/modules`（模块清单如何生成/注册）、官方 `ui-settings-plugins` 如何被组合进 web-app、client 面构建 references（`tsconfig.client.json`）。
2. 将本包加入与官方 UI 包同等位置（modules 清单/组合层/tsconfig references），确认构建后 `/plugins/<id>/client.js` 端点可加载本模块。
3. 替换 `src/client/index.ts` 全部 `// TODO: 调用实际的插件管理 API` 为对 T2.5 Remote API 的真实调用（经官方 client connection/remotes 通道）。
4. 与官方 `ui-settings-plugins` 共存：本模块渲染为其中一个 feature-owned 区块/标签页（不替换官方页）；入口命名与 locale 对齐官方 settings 词汇。
5. e2e 冒烟：官方 `vitest.web` 体系加最小用例（加载设置页→看到插件管理区块→列表渲染 mock 数据→启停一次真实 registry）。
6. locale：控制器内置 en/zh 表改接官方 locale 服务（若官方 UI 包均如此）。

**验收**：web 构建+web 测试绿；手工/自动冒烟证据（截图或测试输出）写入交接记录；grep 本包无 `TODO: 调用` 残留；与官方设置页无渲染冲突。

## T2.7 安全修复移植与对 0.1.1 复核（DEV-CORE，L）

**目标**：T1.3 带入的"unwired"安全文件与 `deferred.list` 逐项落地：接入构建、确认官方未等价实现、补回归测试。

**步骤**（对 adjudication.md 安全类每一项）：
1. 状态判定三选一：**port**（接入并启用）/ **adopted-upstream**（官方 0.1.1 已等价实现→删本地文件，CHANGELOG 记 `adopted upstream <hash>`）/ **redo**（官方重构导致思路失效→按新架构重写）。
2. 重点复核区（官方 0.1.1 重做）：`credentials/**`（官方新增 durable credential records 存储）——`encrypted-provider.ts` 大概率 redo 或 adopted；逐 diff 确认。
3. 每个 port/redo 项：接入所在官方包的构建与依赖图；按 CODING-STANDARDS 补文件头（@module/@since 等）；保持官方 strict TS 风格（无 `as any`）。
4. 回归测试：`packages/…/tests/` 各包测试目录下加 spec（不是集中一个大测试），覆盖修复点本身。
5. 汇总表更新 adjudication.md §T2.7（文件→决策→提交号）。

**验收**：所有安全类条目有最终状态与提交号；`pnpm build && pnpm test` 全绿；交接记录含决策表。**禁止**：为通过编译把官方类型断言成 any；跳过官方已等价实现的比对（必须给出官方 hash 证据）。

## T2.8 P1 缺陷修复 ×5（DEV-CORE，L；DSHV2-101..105）

每个缺陷独立分支 `our/fix/dshv2-10X-*`，独立测试与 Agent Note。依据：`R&D/issue/DSH-CROSS-REVIEW-v2.md`。

| ID | 缺陷 | 位置线索 | 修复方向（执行前先复核官方 0.1.1 是否已修） |
|---|---|---|---|
| 101 | max-tokens 截断时丢弃 tool-call，形成"有意图无执行"死循环 | `packages/llm/llm-deepseek`（finish_reason=length 分支）+ `packages/core/agent-loop` | 截断且存在未完成 tool_calls 时：要么显式终止并告知用户，要么补全执行；禁止静默丢弃；加回归测试模拟截断响应 |
| 102 | win32 目录 fsync no-op，崩溃一致性缺口 | `packages/util/atomic-write`（及各持久化调用点） | Windows 无目录句柄 fsync：实现"日志+重放"或 rename 语义加固，并在代码注释说明平台差异；测试覆盖 win32 路径（本机即 Windows） |
| 103 | 200ms 落盘窗口非同步 flush | session 持久化（`packages/session/session-persistence-*`） | 关键边界（会话结束/进程退出 hook）强制同步 flush；常规写保持批量；可配置立即模式 |
| 104 | 中文 token 估算低估 3–4x（CHARS_PER_TOKEN=4） | grep `CHARS_PER_TOKEN` | 按脚本区分估算系数（CJK ~1.0–1.3 chars/token 量级），或接入 token-meter 精确路径；加中英混合用例 |
| 105 | 双 DEFAULT_CONTEXT_WINDOW 冲突（1M vs 256K） | `packages/llm/llm-deepseek` vs `packages/llm/llm-pi-ai`（grep `DEFAULT_CONTEXT_WINDOW`） | 常量收敛到 llm seam 单一来源+按 provider 覆盖；防止静默取小值截断上下文 |

**验收**：5 个分支各自测试绿后 `--no-ff` 合入 our/v2；每分支 CHANGELOG 条目+Agent Note；若某项发现官方已修，转 adopted 记录（同样要有官方 hash 证据）。

## T2.9 分支独立运行对齐（DEV-CORE，M）

**目标**：与官方安装同机共存（BRANCH-INDEPENDENCE-SPEC 的运行时面）。

**步骤**：
1. 端口隔离：Web 61369 / API 8001 的配置来源检查（环境变量或配置文件，跟随官方配置体系实现覆盖，不硬编码）。
2. 数据目录：全部 DSH 写入路径断言走 `DSH_BRANCH_HOME`（grep 排查 fork 新增代码不得写 `~/.dsh`）；profile 目录同样隔离（`$DSH_BRANCH_HOME/profiles`，对照官方 `$DSH_HOME` 用法）。
3. 共存冒烟：本机若装了官方 dsh 则双开验证（端口/数据不冲突）；否则以配置断言测试代替并在交接记录说明。
4. 更新 `docs/dsh/` 独立运行说明（含环境变量表）。

**验收**：配置断言测试绿；文档含完整环境变量表；冒烟证据（或说明）在交接记录。

## 门禁 G2 验收清单（REV 执行）

- [ ] 治理包：workspace 成员、构建/测试/覆盖全绿、knip 零豁免
- [ ] adapter 阶段 1 集成测试绿 + plugin-compat 文档（三元组）
- [ ] UI：无 TODO 桩、web 冒烟通过、与官方设置页共存
- [ ] 安全移植决策表完整（port/adopted/redo 三态+证据）；P1×5 落地或 adopted
- [ ] 独立运行：环境变量表+断言测试+冒烟证据
- [ ] 所有合入 our/v2 的提交：提交号列表在交接记录；`pnpm build && pnpm test` 全绿
