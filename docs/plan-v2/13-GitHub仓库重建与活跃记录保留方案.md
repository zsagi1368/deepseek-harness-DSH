# 13 · GitHub 仓库重建与活跃记录保留方案

> 编制背景（2026-08-22 核验）：origin 仓库 `zsagi1368/deepseek-harness-DSH` 已被删除（`git ls-remote origin` 返回 GitHub 官方响应 `Repository not found`）。该仓库此前就已是**独立仓库而非真 fork**（早期真 fork 已于 ~08-20 被误删后由同名独立仓库顶替）。本文按 GitHub 官方流程给出重建方案，并取代 03 号文档 §2.3 的"master 重建"争议（远程全新铺设，无需 force push）。
> 依据的官方文档：
> - Fork 流程：https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo
> - 恢复删除仓库：https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository
> - 贡献图规则：https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-on-my-profile

## 0. 推荐结论（2026-08-22 用户确认，最终采用）

**只建一个独立仓库当主开发仓；fork 现在一个都不建，留到真正要向官方提 PR（backlog-005）时再建；被删仓库不恢复，直接全新重建（原 §5 备选 B1 升格为正式路径）。**

1. 用户目标"保留活跃记录"：贡献图规则是 **fork 内提交不计数、独立仓库计数**（§2.3）——fork 当主仓与目标直接冲突。
2. 独立仓库不影响日常同步（`git fetch upstream`，03 §4 SOP 不变）；"全新远程免 force-push 铺设 master"红利两者等同。
3. fork 的独有价值只有"向上游发 PR"与徽标：PR 可**随用随建**（同账号同上游仅一个 fork 名额，现在不占、将来建无障碍）；徽标是装饰。届时不是"拷贝代码"——本地同一个仓库多挂一个 remote，`git remote add fork <url> && git push fork <分支>` 即可开 PR。
4. 被删仓库不恢复（R1/R2 取消）：其内容本地全量在手；放弃的仅是"08-20~22 可能存在（且大概率因 noreply 邮箱根本没记上）的贡献格"与 ≈0 的星标/issue。**反悔保险：90 天恢复窗口内随时可补做 R1/R2**。
5. 配套：git 提交邮箱用**账号已关联邮箱**（03 §7 修订版）；今后 PR 流程 = 建默认名 `deepseek-harness` 的 fork → push 目标分支 → 对 upstream 开 PR。

执行步骤因此简化为：**R3′（用户）：New repository 新建空独立仓库 `deepseek-harness-DSH`（Public，不勾选任何初始化项）→ R4（GIT）：本地 origin 重指 + 推送全部存量分支/tag → R5：凭据/镜像备份 → R6：文档收口。**

---

## 1. 现状与资产盘点

| 资产 | 状态 |
|---|---|
| GitHub `zsagi1368/deepseek-harness-DSH`（独立仓库，含 08-20 推送的 our/base 等） | **已删除**（核验时间 2026-08-22，删除发生在此前 ~1 小时至数小时内） |
| 最早的真 fork（GitHub fork 状态） | ~08-20 已被删除顶替；fork 状态已丢失 |
| 本地 `G:\000Github\DSH\Fork` | **全部内容在手**：our/base、master（快照）、our/fix/bug-006、backup×2、tag×6（含官方 4 个）、upstream 已 fetch 到 0.1.1-rc.2。**代码层面零丢失** |
| 风险 | `.git/config` 的 origin URL 内嵌旧 PAT（该 PAT 可能已随泄露处理被撤销；重建远程后须改用凭据管理器，见 06 T0.1） |

**结论：需要挽回的只有 GitHub 侧元数据（星标/issue/Actions 记录/创建日期/fork 徽标），git 内容本身不需要挽回（本地全有）。**

## 2. 官方规则速览（决定方案边界）

1. **恢复删除仓库**：90 天窗口内可恢复；**个人仓库可自助**（Settings → "Code planning, and automation" → Repositories → **Deleted repositories**），删除后 1 小时内可能还不可恢复；恢复不带回团队权限；**fork 网络中的仓库不能自助恢复**，需付费 GitHub Support 通道。
2. **Fork 创建**：网页 Fork 按钮 / `gh repo fork deepseek-ai/deepseek-harness`；默认与上游同名，**可自定义名**（本方案用回 `deepseek-harness-DSH`）；"Copy the default branch only" 勾选即可（其余分支我们用 git fetch 获取）。
3. **贡献图（绿格子）**：commit 计入的条件 = 仓库是**独立仓库（非 fork）** + 默认分支（或 gh-pages）+ 提交邮箱与账号关联。**fork 里的提交不计入贡献图**。
4. 同一账号对同一上游**只能有一个 fork**——旧的真 fork 已删除，故无冲突。

## 3. "活跃记录"目标拆解（关键认知）

| 你想保留的 | 能否保留 | 路径 |
|---|---|---|
| ① 仓库里的提交历史/分支/tag | ✅ 完全可以 | 恢复旧仓库或从本地推送到新仓库（内容本地全有） |
| ② 贡献图绿格子（既有） | ⚠️ 视恢复情况 | 恢复独立仓库 -OLD 后，其提交是否记账取决于**提交邮箱是否关联账号**：our/base 16 提交用的是 `zsagi1368@users.noreply.github.com`（旧式 noreply 格式，须与 Settings→Emails 中你账号的 noreply 地址一致才计数）。恢复后到资料页核对，缺格无补记手段 |
| ③ 贡献图绿格子（今后） | ⚠️ **fork 不计数** | 若在"今后也要绿格子"和"要 fork 功能"之间取舍，见 §5 备选 C（双仓库制） |
| ④ fork 徽标/网络关系（Forked from、向上游发 PR） | ✅ 重建即得 | 新建真 fork |
| ⑤ 星标/watcher/issue/PR/Actions 历史 | ⚠️ 仅恢复路径可能有 | 自助恢复可带回仓库本体（文档未承诺星标细节）；2 天库龄预计星标≈0，价值低 |

## 4. 推荐方案（主路径，六步）

> 与你的设想（改名隐藏 + 重新 fork）一致，但顺序必须反过来：**仓库已不存在，先恢复、再改名、再新建 fork**。

**R1 自助恢复被删仓库（用户操作，5 分钟）**
GitHub → 个人 Settings → "Code planning, and automation" → Repositories → **Deleted repositories** → 找到 `deepseek-harness-DSH` → Restore。
（若删除未满 1 小时列表没有它，等 1 小时再试；它是独立仓库，不涉及 fork 网络限制。）

**R2 恢复后立即处置为历史存档（用户操作）**
- 改名：Settings → Repository name → `deepseek-harness-DSH-OLD`（保留既有提交历史与任何星标/issue）。
- 处置二选一：**Archive（推荐）**= 公开只读存档，历史清清楚楚，绿格子继续有效；**Private（你说的"隐藏"）**= 他人不可见，且个人资料默认不显示私有贡献（需在 Profile → Contribution settings 勾选 "Private contributions" 才自己可见）。
- 到个人资料页核对 2026-08-20~22 的贡献格是否点亮；没亮=邮箱未关联（见 §3②），今后的提交邮箱策略见 R5。

**R3 新建真 fork（用户操作，按官方 fork-a-repo 流程）**
- 网页打开 `deepseek-ai/deepseek-harness` → 右上 **Fork** → Owner=zsagi1368 → Repository name=**`deepseek-harness-DSH`**（自定义名，与本地既有 origin URL 完全一致，零配置迁移）→ 勾选 "Copy the default branch only" → **Create fork**。
- 或装 gh CLI 后：`gh repo fork deepseek-ai/deepseek-harness --clone=false` 后在网页改名。
- 注意：新 fork 名复用了旧名会切断 -OLD 改名产生的网页重定向（可接受，本地引用优先）。

**R4 本地远程重配与推送布局（GIT 执行）**
```bash
cd "G:/000Github/DSH/Fork"
git remote set-url origin https://github.com/zsagi1368/deepseek-harness-DSH.git   # 去掉内嵌 PAT（若 URL 未变则此步仅做确认）
git config credential.helper manager
git ls-remote origin        # 首次触发凭据登录
# 过渡期保护性推送（重组 our/v2 之前的存量）：
git push origin our/base master our/fix/bug-006-tool-call-name backup/before-sync-rc8-20260820-122453 backup/pre-our-base-20260820-111705
git push origin --tags
# 重组完成后（Plan 07/09）再补：our/v2、archive/*、master 重建为 upstream/master 镜像、默认分支设为 our/v2
```
**此方案红利**：远程是全新的 → `master` 可直接推 `upstream/master` 内容成为真镜像，03 号文档原 §2.3 的 force-push 争议**彻底消失**（新版已改写）。

**R5 防再删与备份制度化（GIT+SEC）**
- 权限：今后给 agent 的凭据一律用 **fine-grained PAT，只授 Contents 读写，绝不授 `delete_repo`**；删除级操作只留给用户本人。
- 双备份：本地裸镜像 `git clone --mirror` 到 `G:\000Github\DSH\Mirror-Backup\`（每次 Phase 门禁后更新一次 `git --git-dir=... push --all` 或重克隆）；有条件再挂第二远程（如私有 Git 仓库/网盘同步）。
- STATE.md 增加"远程状态"栏，任何远程操作前后核验 `git ls-remote` 可达性。

**R6 与重组计划的衔接**
- 03 §2.3 已按本方案改写（master 铺设无需 force push）。
- 任务映射：R1–R3=用户操作（ORCH 提醒与验收）；R4 并入 T0.4（备份推送目标改到新 fork）；R5 并入 T0.1/T0.4 的强化项。

## 5. 备选方案

- **B1 不恢复直接重建**（若自助恢复列表里找不到/放弃）：跳过 R1/R2，直接 R3 起。损失：-OLD 的既有星标/issue（预计≈0）与"既有贡献格确认"机会。内容零损失。
- **B2 追回最早那个真 fork**：~08-20 删除、90 天窗口内，但属 fork 网络成员 → **不能自助恢复，只能付费 Support 通道**，且价值低（内容已被本地与 -OLD 覆盖，fork 状态由 R3 重建）。**不建议**，除非它有可观的星标/PR 记录（用户可凭记忆判断）。
- **C 双仓库制（若"今后绿格子"权重最高）**：主开发仓 = 独立仓库 `deepseek-harness-DSH`（贡献计入）；`deepseek-harness` fork 仅在向官方提 PR（backlog-005）时同步目标分支过去。代价：维护两个远程、失去日常 Sync fork 按钮便利。**默认不采用**，记为决策开关：若 R2 核对发现 -OLD 贡献格没点亮且用户在意，可随时切换到 C。

## 6. 执行顺序总表

| 步骤 | 操作者 | 前置 | 产出/验收 |
|---|---|---|---|
| R1 恢复 | 用户 | 删除满 1 小时 | Deleted repositories 列表中 Restore 成功 |
| R2 改名+Archive/Private+贡献核对 | 用户 | R1 | -OLD 存在且只读/私有；贡献格状态记录到 STATE.md |
| R3 新 fork | 用户 | R2 | `zsagi1368/deepseek-harness-DSH` 带 "forked from" 徽标 |
| R4 远程重配+存量推送 | GIT | R3 | `git ls-remote origin` 列出全部本地分支/tag |
| R5 权限+镜像备份 | SEC+GIT | R4 | fine-grained PAT 生效；Mirror-Backup 存在 |
| R6 文档与任务更新 | ORCH | R4 | STATE.md/03 号文档为最新 |
