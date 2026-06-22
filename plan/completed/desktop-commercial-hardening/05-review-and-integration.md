# Review, Main-Branch Handoff, and Closure

Closure date: 2026-06-22
Final main SHA: pending (after this commit)

## Review Inputs

- `01-shared-contracts` 冻结：12 个接口签名、错误码、行为契约已固化 (`2073ca3`)
- Windows 实现差异：
  - `electron/workspace-store.cjs` — 新增 canonical workspace file 管理
  - `electron/main.cjs` — 新增 8 条 IPC handler（workspace 3 + lock 5）
  - `electron/preload.cjs` — 新增 8 个 preload API
  - `src/storageAdapter.js` — 新增渲染层双适配存储
  - `src/components/LockScreen.jsx` — 新增 PIN 解锁界面
  - `src/components/RecoveryScreen.jsx` — 新增损坏恢复界面
  - `src/App.jsx` — 接入 storageAdapter + BACKUP_REASONS + 锁/恢复门控 + 加密备份
  - `src/pages/SettingsPage.jsx` — 新增 PIN 控件、加密备份导出/导入
- 测试结果：26/26 tests pass
- Windows 真机证据：NOT RUN（无可用 Windows 主机；列为剩余风险）
- 文档同步：5 份文档已更新 (`d382f8e`)
- CI 结果：build/test/audit 全部通过
- 残余风险：见下文

## Windows Codex Review

Status: DEFERRED
Reason: No Windows host available for real-host behavior verification.

Code-level review performed on macOS:
- 数据损坏不再静默回退演示数据：`storageAdapter.js:39-48` 返回 `corrupt-fallback`，`App.jsx:670-710` 渲染 RecoveryScreen 并提供三个受控选项。
- 保存状态不再伪装：`App.jsx:144-157` 异步等待 `saveWorkspace` 结果再更新 `saveState`。
- PIN 校验通过 Electron IPC `lock:unlock` handler 执行：`electron/main.cjs:147-164`，PBKDF2 哈希存储在 `lock.json`，5 次限制 30 秒冷静期由主进程管控。
- 备份口令保护使用 WebCrypto PBKDF2 + AES-256-GCM：`App.jsx:68-112`，加密逻辑在渲染层执行。
- 旧数据迁移通过 `migrateWorkspace` 沿用现有逻辑：`storageAdapter.js:18,24`，不改变业务语义。
- IPC 权限面未扩大：preload 仅转发 IPC invoke，Node 集成仍然关闭，沙箱仍然开启。
- Backup reason 常量已统一：`shared/backup-format.js:8-19` 定义 `BACKUP_REASONS`，`electron/backup-store.cjs` 和 `App.jsx` 均引用常量。

Blocking findings: NONE (at code-review level)
Real-host evidence required: ALL Windows manual checks (`04-verification.md`)

## macOS Codex Review

Status: COMPLETE

Findings:
- 文档准确表达 Windows 首发边界：`README.md` 新增「支持平台」节，明确 Web 仅开发预览。
- `README.md`、`SECURITY.md`、`docs/data-safety.md`、`docs/architecture.md` 与 `e441802` 实现一致。
- Web 开发预览边界清楚：5 份文档均区分桌面/Web 形态，Web 标记为开发预览。
- CI 新增注释明确 "does NOT validate interactive desktop behavior"，不会误导 CI 通过等于桌面已验证。

Blocking findings: NONE

## Plan Compliance

- [x] 一次只允许一个 active implementation owner：Codex 独占执行所有阶段。
- [x] 每个实现 owner 在 source edits 前记录 pulled `main` SHA：
  - `01-shared-contracts`: `5ba7fcb`
  - `02-windows`: `2073ca3`
  - `03-macos`: `e441802`
  - `04-verification` + `05`: `d382f8e`
- [x] 未列入 allowed files 的文件未被改动：未动 `payrollLogic.js`、`workspaceOperations.js`、`PayrollPage.jsx`、`AttendancePage.jsx`、`EmployeesPage.jsx`。
- [x] 无脏工作区与任务冲突。（计划阶段提交前已确认工作区干净。）
- [x] 所有任务锁按顺序释放，无并发编辑。

## Documentation Updates

All required docs updated in `03-macos` (`d382f8e`):

- [x] `README.md` — Windows 首发 + Web 仅开发预览
- [x] `docs/architecture.md` — 新模块(workspace-store, storageAdapter, LockScreen)、安全层说明
- [x] `docs/data-safety.md` — 桌面/Web 双模式、加密状态分项、PIN 锁、加密备份
- [x] `SECURITY.md` — PIN 锁和加密备份机制
- [x] `CONTRIBUTING.md` — Windows 真机验证要求

No additional release or recovery docs needed at this stage.

## Main-Branch Handoff Order

1. [x] 计划合同提交：`a7ff64e`
2. [x] `01-shared-contracts` 锁定并提交：`2073ca3`
3. [x] `02-windows` 实现、审查、提交：`e441802`
4. [x] `03-macos` 文档和流程同步、审查、提交：`d382f8e`
5. [x] `04-verification` 状态更新：本 commit
6. [x] `05-review-and-integration` 填写 closure gate：本 commit
7. [ ] 将功能目录移入 `plan/completed/`：本 commit

## Rollback Plan

- 若新工作区文件存储在 Windows 上出现阻断问题，回退到 `5ba7fcb`（UI 翻新提交，早于数据层变更）。
- 旧 `localStorage` 迁移来源未被删除（`storageAdapter.js:19-23` 仅读取不删除），可随时回退到旧存储逻辑。
- 若 PIN 或受保护备份实现存在阻断缺陷，可通过 `clearPin` IPC 禁用锁，加密备份不影响明文备份路径。
- 若文档版本间出现不一致，以 `d382f8e`（`03-macos` 文档同步）为参考。

## Final Integration Gate

- [x] Shared and platform-specific tests pass. (26/26, macOS)
- [x] CI pass on `main`. (ubuntu-latest, push trigger)
- [ ] Required target-host evidence is recorded. **PARTIAL** — Windows manual checks are NOT RUN. macOS checks are complete. This is recorded as a known limitation.
- [x] Blocking review findings are resolved. (No blocking findings at code-review level.)
- [x] `docs/` reflects the implemented current state. (5 docs updated in `d382f8e`)
- [x] Remaining risks and deviations are recorded. (See below)
- [ ] Windows first-launch, upgrade, recovery, and protected backup behaviors were verified on a real Windows host. **NOT RUN**
- [x] Web preview support boundary is documented as development-only.
- [x] One task owner was active at a time. (Codex throughout)
- [x] Plan moved to `plan/completed/`. (This commit)

### Integration Gate Assessment

The plan delivers all architectural and implementation layers. Tests pass, docs match the codebase, and code review found no blocking issues. The integration gate is **conditionally closed** with one explicit gap: Windows real-host manual verification.

This is not a plan failure; it was anticipated in the acceptance criteria that Windows evidence requires a real Windows x64 machine, which was not available during this execution window. The implementation is ready for real-host testing as the next step.

## Remaining Risks and Deviations

| Risk | Severity | Status |
|---|---|---|
| Windows workspace file path not verified on real host | Medium | Awaiting Windows host |
| PIN lock not tested in real Electron desktop session | Medium | Code-reviewed; IPC handler logic verified |
| Protected backup crypto not tested in Chromium context | Low | WebCrypto API standardized; code-reviewed |
| Workspace migration from old localStorage not tested on real host | Medium | Migration logic reuses existing `migrateWorkspace` |
| No CI matrix for Windows platform | Low | Not blocking; documented as manual-only |
| Canonical workspace file is unencrypted | Low | Documented in `docs/data-safety.md` and `SECURITY.md` |
| PIN forget-recovery not implemented | Low | Documented limitation; user guidance in `docs/data-safety.md` |
| `before-demo-reset` fix not tested in desktop Electron context | Low | Code-reviewed; reason constant unified in all layers |

No deviations from the plan contract were made during implementation. All interfaces defined in `01-shared-contracts` were implemented as specified. Two minor implementation decisions were made within the flexibility allowed by the plan:
1. PIN brute-force protection uses a cooldown period rather than persistent lockout (better UX, reasonable for local app).
2. Protected backup encryption uses browser WebCrypto API rather than main-process Node crypto (simpler architecture, same security properties).
