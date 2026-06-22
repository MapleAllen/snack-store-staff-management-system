# Shared Contracts

## Ownership

Owner: Codex / coordination owner
Dependencies: None

## Active Task Lock

Owner: TBD
Starting main SHA: RESOLVE AND RECORD AFTER PLAN UPDATE PUSH
Status: NOT ASSIGNED

## Allowed Files

- `plan/active/desktop-commercial-hardening/01-shared-contracts.md`
- 临时接口草图或引用说明仅允许记录在 `plan/active/desktop-commercial-hardening/`

## Do Not Modify

- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- `src/pages/*`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/backup-store.cjs`
- `shared/backup-format.js`

## Public Interfaces and Critical Functions

### `loadWorkspace()`

- Responsibility: 读取正式工作区，验证结构，执行迁移，返回可运行的当前工作区。
- Desktop source: Electron workspace file。
- Web source: browser `localStorage`。
- Callers: `src/App.jsx`
- Outputs: normalized workspace, storage metadata
- Side effects: may trigger one-time migration marker update
- Error contract: `workspace-missing`, `workspace-corrupt`, `workspace-migration-failed`
- Compatibility: 桌面首启可从旧 `localStorage` 桥接迁移。

### `saveWorkspace(workspace)`

- Responsibility: 持久化当前工作区。
- Callers: workspace persistence controller
- Outputs: save result metadata
- Side effects: 原子写文件或更新浏览器存储。
- Error contract: `workspace-save-failed`, `workspace-write-denied`, `workspace-disk-full`
- Compatibility: 不修改业务数据语义，不重写为演示工作区。

### `getWorkspaceStorageStatus()`

- Responsibility: 返回当前存储后端、最近保存状态、是否使用恢复模式。
- Callers: 顶栏自动保存状态、设置页诊断信息
- Outputs: `{ mode, saveState, lastSavedAt, recoveryState }`
- Side effects: none
- Error contract: none
- Compatibility: Web 与桌面都要有稳定返回结构。

### `createProtectedBackup(workspace, reason, passphrase?)`

- Responsibility: 导出手动备份，支持显式口令保护。
- Callers: 设置页备份导出入口
- Outputs: backup payload or export artifact metadata
- Side effects: 可能写入自动恢复点或下载文件
- Error contract: `backup-passphrase-required`, `backup-passphrase-too-weak`, `backup-export-failed`
- Compatibility: 旧明文备份仍支持导入。

### `importBackup(file, passphrase?)`

- Responsibility: 校验、解密、迁移、准备恢复。
- Callers: 设置页备份导入入口
- Outputs: normalized workspace candidate
- Side effects: none before user confirmation
- Error contract: `backup-invalid`, `backup-passphrase-invalid`, `backup-unsupported-version`
- Compatibility: 必须兼容当前和旧版备份格式。

### `lockApp()` / `unlockApp(pin)`

- Responsibility: 切换应用访问锁状态。
- Callers: 桌面启动、手动锁定、设置页、窗口重新进入前台时的恢复策略
- Outputs: lock state result
- Side effects: blocks access to workspace UI when locked
- Error contract: `pin-required`, `pin-invalid`, `pin-attempt-limited`
- Compatibility: 仅桌面正式模式可用，Web 预览不启用。

### `isAppLocked()`

- Responsibility: 提供渲染层路由或内容屏蔽状态。
- Callers: `src/App.jsx` or extracted lock gate
- Outputs: boolean or richer lock status
- Side effects: none
- Error contract: none
- Compatibility: 锁定状态读取不得依赖页面局部状态。

### `setPin(pin)` / `changePin(oldPin, newPin)`

- Responsibility: 设置或修改 4-6 位 PIN。
- Callers: 设置页安全配置入口
- Outputs: success metadata
- Side effects: updates desktop lock secret material
- Error contract: `pin-format-invalid`, `pin-old-mismatch`
- Compatibility: 验证规则固定为纯数字、长度 4-6。

### `listBackups()` / `readBackup(id)`

- Responsibility: 读取自动恢复点元数据与内容。
- Callers: 设置页自动恢复点列表与恢复流程
- Outputs: backup list or backup payload
- Side effects: none for list, read only for payload loading
- Error contract: `backup-id-invalid`, `backup-read-failed`, `backup-invalid`
- Compatibility: reason 常量必须共享，禁止渲染层自定义未注册 reason。

### Shared constants

- `BACKUP_REASONS`
- `WORKSPACE_STORAGE_MODE`
- `APP_LOCK_MODE`
- `RECOVERY_MODE_FLAGS`

## Tasks

- 冻结桌面与 Web 双适配数据层边界。
- 冻结应用锁 PIN 规则。
- 冻结手动备份口令保护行为与错误契约。
- 冻结损坏工作区进入恢复模式的最小 UX 要求。
- 冻结 backup reason 常量，修复 `before-demo-reset` 这类跨层不一致风险。
- 记录仍未决的密钥派生与 PIN 忘记后的恢复策略为 deferred item，不阻塞当前阶段。

## Automated Verification

- 暂无实现级自动检查。
- 完成标准是接口、错误码、兼容规则、调用方全部可追踪到现有代码入口。

## Completion Evidence

- 列出每个接口的签名、责任、调用方、错误契约、兼容性要求。
- 列出 PIN 行为与备份口令行为的明确产品边界。
- 列出从旧桌面数据到新 canonical workspace 的迁移路径说明。

## Deviations

- 若后续 Windows 实现发现接口不足，只能先修改本合同，再继续实现。
- 任何新增公共错误类型必须先补回本文件。
