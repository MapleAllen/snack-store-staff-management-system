# desktop-commercial-hardening Overview

Created: 2026-06-22
Status: DRAFT
Coordination owner: Codex / macOS host
Working branch: `main`

## Goal

将项目从“公开源码 + 内部打包能力”推进到“Windows 单机商用首发准备阶段”，优先补齐数据承载安全、恢复可靠性、应用访问保护、受控备份，以及 Windows 发行验证闭环。

## Scope

- 将 Windows 桌面正式数据源从渲染进程 `localStorage` 迁移到 Electron 主进程管理的本地工作区文件。
- 建立损坏检测、受控恢复、原子保存、保存失败反馈。
- 增加应用锁，采用 4-6 位 PIN。
- 增加手动备份口令保护。
- 保留 Web 仅作为开发预览。
- 建立 Windows 安装、升级、备份恢复、卸载回归要求和证据模板。
- 更新 `docs/` 反映新的当前状态。

## Non-Goals

- 不做云同步。
- 不做多人协作、账号体系、权限中心。
- 不把 Web 浏览器模式纳入正式商用支持。
- 不在本阶段实现自动更新。
- 不在本阶段引入全量本地静态数据加密，除非后续单独立项。
- 不进行大规模 UI 重设计。

## Current-State Evidence

- 当前桌面正式数据仍来自渲染进程 `localStorage`：`src/App.jsx:65-75`, `src/App.jsx:113-121`
- 当前桌面能力只把自动恢复点交给 Electron：`electron/preload.cjs:3-7`, `electron/main.cjs:48-55`
- 当前备份为明文 JSON，本机保留：`electron/backup-store.cjs:42-59`, `docs/data-safety.md:5-20`
- 当前公开边界仍是源码发布，不是可信安装包分发：`README.md:21-27`, `SECURITY.md:11-15`
- 当前 CI 仅 Ubuntu 验证，无 Windows 产品级安装回归：`.github/workflows/ci.yml:12-31`
- 当前存在损坏数据静默回退演示工作区风险：`src/App.jsx:65-75`, `src/App.jsx:113-121`
- 当前存在桌面备份 reason 不一致风险：`src/App.jsx:427-430`, `electron/backup-store.cjs:3-8`, `electron/backup-store.cjs:42-45`

## Invariants

- `docs/` 是当前事实，`plan/` 只是执行意图。
- 任何工作仍在 `main` 顺序推进，一次只有一个 active task owner。
- 桌面版必须继续保持 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`：`electron/main.cjs:18-23`
- 旧版手动备份仍可恢复：`shared/backup-format.js:1-31`
- 月结快照冻结语义不可改变：`src/workspaceOperations.js:76-115`
- 已离职员工仍保留历史但不进入活动工资统计。
- Web 开发预览仍可运行，但不是正式产品边界。

## Dependencies

- 先明确并冻结共享接口，再做 Windows 实现。
- Windows 真实主机证据是所有桌面行为结论的最终依据。
- 任何数据层变更都依赖 `migrateWorkspace(...)` 兼容旧结构：`src/payrollData.js:162-215`

## Risks and Unknowns

- 应用锁和备份口令的密钥/口令派生方案尚未定稿。
- 工作区文件若暂不加密，仍需要在文档中清楚声明依赖 Windows 账户和 BitLocker。
- 现有 `App.jsx` 过大，若在数据层切换时同时大拆，容易扩大回归面。
- 当前工作区已有未提交改动，开工前必须确认归属并清理执行边界。
- PIN 忘记后的恢复策略暂不在本阶段决策范围内，不能阻塞当前规划，但必须在实现时避免暗含不可逆承诺。

## Acceptance Criteria

- Windows 桌面正式数据源不再依赖渲染进程 `localStorage`。
- 损坏工作区不会静默回退到演示数据并覆盖现场。
- 应用锁可在 Windows 冷启动与唤醒后生效，使用 4-6 位 PIN。
- 手动备份支持口令保护，正确口令可恢复，错误口令被拒绝。
- 旧 JSON 备份和旧桌面本地数据有明确迁移路径。
- Windows 安装、升级、恢复、卸载有真实主机回归证据。
- `docs/architecture.md`、`docs/data-safety.md`、`README.md`、`SECURITY.md` 与实现一致。

## Main-Branch Handoff Sequence

1. 先提交计划合同更新。
2. 分配 `01-shared-contracts` 任务锁，冻结接口与错误契约。
3. 审核并提交共享契约后，再分配 `02-windows` 实现锁。
4. Windows 实现经审查和提交后，再分配 `03-macos` 任务锁做文档、流程、支持边界与非 Windows 验证协调。
5. 最后执行 `04-verification` 与 `05-review-and-integration` 收口。
6. 任何阶段若发现公共契约必须变更，停止实现，先修订计划再继续。
