# 06 · 任务书 — Phase 0：安全处置与环境准备

> 使用说明：本文每个任务自包含。派发时附上本文对应任务节 + `10-质量保障与验收标准.md`。执行角色见各任务头。仓库根 = `G:\000Github\DSH\Fork`，工作区根 = `G:\000Github\DSH`。

---

## T0.1 GitHub PAT 轮换与远程凭据整改（SEC+GIT，需用户配合）

**目标**：消灭 `.git/config` 中的 PAT 明文（A-4），改用凭据管理器。

**背景事实**：origin URL 形如 `https://zsagi1368:<PAT>@github.com/zsagi1368/deepseek-harness-DSH.git`；该 PAT 同时出现在 `R&D/FINAL-DELIVERY-REPORT.md`（T0.2 处理）。已核实 PAT **未**进入任何 git 提交对象（无需改写历史）。

**步骤**：
1. 报告 ORCH → 由 ORCH 请用户在 GitHub 完成：`Settings → Developer settings → Personal access tokens` **revoke 旧 token**；如需新 token，最小权限（repo 读写即可）且**只通过凭据管理器输入**。
2. GIT 执行：
   ```bash
   cd "G:/000Github/DSH/Fork"
   git remote set-url origin https://github.com/zsagi1368/deepseek-harness-DSH.git
   git config credential.helper manager        # Windows: Git Credential Manager
   ```
3. 验证一次只读远端操作触发凭据弹窗并可成功：`git ls-remote origin HEAD`。
4. 顺带固化 03 §7 的本机 git 配置（user.name=DSH Team / user.email=dsh-team@zsagi.us.ci / core.autocrlf=false——**在重建基线后**再设 autocrlf=false，此刻先记录）。

**验收**：`git remote -v` 两行 URL 均无 `@token` 模式；`git ls-remote origin HEAD` 成功；用户确认旧 token 已 revoke。**禁止**：把新 token 写进任何文件/命令行参数/交接记录。

## T0.2 R&D 泄露文档脱敏（SEC）

**目标**：工作区内不再有任何 `ghp_` 字样（A-4）。

**步骤**：
1. `grep -rn "ghp_" "G:/000Github/DSH" --include="*.md" --include="*.txt" --include="*.sh" --include="*.yml"`（排除 Fork/.git 与 node_modules）定位全部出现点。
2. 对每处：把 token 串替换为 `[REDACTED-已轮换]`，并在行尾追加 `<!-- 脱敏 2026-08-22 -->`。
3. 已知必改：`R&D/FINAL-DELIVERY-REPORT.md`。若 Fork 工作树内文档也有（如 FINAL-DELIVERY-REPORT.md 副本），先不改动 Fork 内文件（其处置随 T1.2 裁决），只在交接记录中标注。

**验收**：上述 grep 零命中（凭据管理器除外）。交接记录附 grep 前后输出。

## T0.3 工作区清理与 stash 处置（GIT）

**目标**：旧工作区收尾，不留悬置物。

**步骤与决策**：
1. 删除 4 个垃圾文件：`rm _tmp_2687_* _tmp_2893_* _tmp_2914_* _tmp_3906_*`（均为未跟踪空文件，先 `ls -la` 确认大小为 0 再删）。
2. stash 处置：`git stash show -p 'stash@{0}' > ../Plan/artifacts/stash-watcher.patch` 留档；**不 apply**（其内容属于旧 our/base 的 `packages/plugins/guards/watcher.ts`，将随 T2.4 在新基线重做）；然后 `git stash drop 'stash@{0}'`。
3. 数千个"已修改"构建产物文件：**不做任何 git 操作**（不 add 不 restore），它们是旧跟踪产物噪音，随 our/v2 重建自然消失（T1.1）。在交接记录说明即可。

**验收**：`git status --porcelain | grep '_tmp_'` 为空；`git stash list` 为空；`Plan/artifacts/stash-watcher.patch` 存在且内容为 watcher.ts 的 +8/−5 diff。

## T0.4 备份与归档基线（GIT）

**目标**：一切后续操作的退路就位。

**步骤**：
```bash
cd "G:/000Github/DSH/Fork"
git fetch upstream --tags --prune                  # 确认 upstream/master = b150a551b8（0.1.1-rc.2）
git branch backup/20260822-pre-v2 our/base          # 当前开发线快照
git branch archive/our-base-v1 our/base             # 归档别名（与 backup 同指，命名即用途）
git branch archive/our-fix-bug-006 our/fix/bug-006-tool-call-name
git push origin backup/20260822-pre-v2 archive/our-base-v1 archive/our-fix-bug-006
```
清点并在 STATE.md 记录：全部 tag（6 个）、`0f64d82f5b`（tag 0.1.0-rc.8-DSH20260820a，旧一轮工作所在）、两个既有 backup 分支。

**验收**：`git branch -a` 含上述 archive/*；`git ls-remote origin` 能看到它们；STATE.md 有清点表。

## T0.5 Plan 套件入库 + R&D 骨架整理（DOC）

**目标**：方案文档持久化并建立归档骨架（本任务产物不进新基线，只入归档线）。

**步骤**：
1. 在 Fork：`git checkout archive/our-base-v1` 后建 `docs/plan-v2/`，把 `G:/000Github/DSH/Plan/*.md` 全量复制进去，提交 `docs: add DSH v2 reorganization plan (13 docs)`（作者用统一身份）。推送。
   - 注意：此提交落在 archive 线，仅作持久化；**our/v2 不会携带它**（新基线另有 docs/dsh）。
   - 切回：`git checkout our/base`。
2. 工作区整理：`mkdir -p R&D/archive`；`mv TMP/ISSUE_INVENTORY..md R&D/ISSUE-INVENTORY.md`（修掉双点文件名 C-7）；TMP 目录空则删。
3. 建立空骨架：`R&D/archive/README.md`（一句话说明：过程报告归档处，权威文档见 Plan/ 与 docs/dsh/）。

**验收**：archive 线上有 plan 提交（附提交号）；`R&D/ISSUE-INVENTORY.md` 存在且旧路径不存在；`R&D/archive/` 存在。

## 门禁 G0 验收清单（REV 执行）

- [ ] T0.1–T0.5 交接记录齐全（六节俱全）
- [ ] `grep -rn "ghp_" G:/000Github/DSH --include="*.md"` 零命中
- [ ] `git remote -v` 无凭据；`git stash list` 空；无 `_tmp_*`
- [ ] archive/backup 已推送；STATE.md 就位且有任务表
- [ ] 用户已确认 PAT 轮换完成
