# STATE — DSH v2 重组状态板

> ORCH 维护；每次调度后更新。新会话冷启动先读本文件（见 12 §6）。
> 更新时间：2026-08-22（初始版，编制时快照）｜当前 Phase：待启动（P0 未开始）｜门禁：G0❌ G1❌ G2❌ G3❌ G4❌ G5❌

## 关键事实速览（2026-08-22 第三次更新：远程重建完成 ✅）

- `upstream/master` = `b150a551b8`（官方 0.1.1-rc.2）；基线 tag `dsh-v0.1.0-rc.8`；官方新增 207 提交已 fetch。
- 当前分支 `our/base`（16 提交孤儿链）；本地 `master` 已重建为官方镜像 `b150a551b8`（旧 master 存档为 `archive/old-master-snapshot`）。
- **origin 远程已重建完成**（13 号文档 R3′/R4/R5 全部落地）：`zsagi1368/deepseek-harness-DSH` 公开独立仓库，含 master + our/base + our/fix/bug-006 + archive×1 + backup×2 + 全部 6 tag；默认分支 master；topics 已设；本地裸镜像 `Mirror-Backup/fork-core.git` 已同步。
- 推送备注：整包 HTTPS/SSH 均被网络环境掐断，最终以 first-parent 主线 400 提交分段 + 失败二分 + 断点续推完成；tag `0.1.0-rc.8-DSH20260820a` 因邮箱隐私拦截已用 noreply tagger 重打（仅改 tag 元数据，指向提交不变）。
- Actions 已激活：官方 18 工作流随 master 生效（68+ runs），Dependabot 自动开 5 个依赖 PR——按 T3.1 统一处置，勿逐个手工处理。
- 本机新增：gh CLI 2.98.0（未登录，用 `gh auth login` 浏览器登录）；SSH 推送密钥 `dsh-push-workbuddy-20260822`（Settings→SSH keys 可管理）；git 提交身份已设为 noreply 记账邮箱。
- 待用户操作：无 ✅ T0.1 已完成（2026-08-22）：旧全权限 token 已吊销（API 401 实证）；新 classic token（无 delete_repo/admin 类权限，含 repo+workflow+write:packages）存于 `G:\000Github\DSH\.agent-env`（所有 git 仓库之外）；无人值守模式 = 代理会话先 `source /g/000Github/DSH/.agent-env` 再用 gh/GH_TOKEN；gh 交互登录不可用（缺 read:org，无碍）。

## 任务表

| 任务 | 状态 | 负责角色 | 分支 | 交接记录 | 备注 |
|---|---|---|---|---|---|
| T0.1 | todo | SEC+GIT | — | — | 需用户轮换 PAT |
| T0.2 | todo | SEC | — | — | |
| T0.3 | todo | GIT | — | — | stash→artifacts |
| T0.4 | todo | GIT | — | — | |
| T0.5 | todo | DOC | archive线 | — | |
| T1.1–T1.5 | todo | GIT/ARCH/QA | — | — | 关键路径 |
| T2.1–T2.5 | todo | DEV-PLUGIN | — | — | |
| T2.6 | todo | DEV-UI | — | — | |
| T2.7–T2.9 | todo | DEV-CORE | — | — | |
| T3.1–T3.4 | todo | QA | — | — | T3.2 可提前 |
| T4.1–T4.4 | todo | DOC | — | — | |
| T5.1–T5.5 | todo | GIT/REV/SEC/ORCH | — | — | 发布需用户确认 |

## 冲突区占用

（空）

## 阻塞与升级

- T0.1 等待用户 PAT 轮换确认（不阻塞 T0.2/T0.5 起步）。远程重建已完成，T0.4 的推送目标已恢复可达。

## 债务登记

（空；规则：临时豁免必须在此登记编号 D-xxx 与解除条件）
