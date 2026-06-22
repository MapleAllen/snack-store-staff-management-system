# Shared Contracts

## Ownership

Owner: Codex / macOS host
Dependencies: None
Working branch: `main`

## Active Task Lock

Owner: UNASSIGNED
Starting main SHA: RESOLVE AND RECORD AFTER PLAN UPDATE PUSH
Status: NOT ASSIGNED

## Allowed Files

- `plan/active/windows-unsigned-release-readiness/01-shared-contracts.md`
- Temporary contract notes only under `plan/active/windows-unsigned-release-readiness/`

## Do Not Modify

- `src/**`
- `electron/**`
- `shared/**`
- `package.json`
- `.github/workflows/**`
- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/**`

The contracts below freeze scope and evidence rules for this phase. Runtime code, workflow, packaging, and docs changes belong to later task locks.

---

## 1. Public Release Boundary

### 1.1 Boundary Rule

- 在不存在 signed Windows channel 的前提下，项目公开发布边界继续保持源码-only。
- 本阶段允许生成 unsigned Windows 安装包，但它们只能被描述为：
  - 内部验证产物，或
  - 受控候选分发产物。
- 任何文档、workflow 名称、artifact 名称、release 说明都不得暗示“官方可信 EXE 已公开发布”。

### 1.2 Compatibility Requirement

- 该边界必须与 `AGENTS.md` 的产品合同保持一致。
- 若后续要允许公开 EXE 分发，必须单独立项并引入 signed channel。

---

## 2. Versioning Contract

### 2.1 Default Version Strategy

- 当前仓库元数据停留在 `2.0.0`，但 `main` 已包含硬化实现、文档同步和后续修复。
- 若本阶段不引入新的用户可见业务功能，默认将下一个版本切点定为 `2.0.1`。
- 只有在范围扩大到新增产品能力时，才改为 `2.1.0` 或更高次版本。

### 2.2 Required File Alignment

- `package.json` version
- `CHANGELOG.md`
- 任何新增发布说明文档
- Windows 产物命名中的版本号

这些文件和产物必须对应同一最终 `main` SHA。

---

## 3. CI and Packaging Contract

### 3.1 Required Automated Signals

最终阶段必须在同一 SHA 上记录以下自动化信号：

- Ubuntu: `npm ci`, `npm run check`, `npm audit --audit-level=high`
- macOS: `npm ci`, `npm run check`
- Windows: `npm ci`, `npm run check`, `npm run package:win`, `npm run dist:win`

### 3.2 Messaging Rule

- 所有 CI 注释、job 名称和文档必须继续明确：CI 只能证明依赖安装、测试、构建和打包成功，不能证明 PIN、迁移、恢复、安装升级等交互式桌面行为。

### 3.3 Artifact Contract

- `package:win` 代表 unsigned unpacked/dir smoke build。
- `dist:win` 代表 unsigned NSIS installer build。
- 若新增制品清单或哈希脚本，其职责必须是：
  - 从构建输出中收集预期产物
  - 生成稳定的文件名、大小和 SHA256 信息
  - 当预期产物缺失时显式失败
- 产物清单仅作为审查和验证证据，不自动升级为公开下载承诺。

---

## 4. Evidence Carry-Forward Contract

### 4.1 Carry-Forward Rule

已完成的 Windows 真机验证证据，只有在最终收口 SHA 相比证据 SHA 未修改以下受影响文件集合时，才能直接沿用：

- `src/App.jsx`
- `src/storageAdapter.js`
- `src/payrollData.js`
- `src/workspaceOperations.js`
- `src/pages/SettingsPage.jsx`
- `src/components/LockScreen.jsx`
- `src/components/RecoveryScreen.jsx`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/workspace-store.cjs`
- `electron/backup-store.cjs`
- `shared/backup-format.js`

### 4.2 Re-Run Rule

- 如果后续提交触碰上述任何文件，`04-verification` 必须明确记录需要重跑的 Windows 检查项。
- 如果后续提交只修改 `docs/**`、`plan/**`、`.github/workflows/**`、`package.json` 版本号或新增的非运行时脚本，则可沿用已有交互式证据，但必须在 `04-verification` 中写清楚沿用理由。

---

## 5. Documentation Truth Contract

本阶段关闭前，以下文件必须与真实状态一致：

- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/architecture.md`
- `docs/data-safety.md`
- any new release/evidence doc added during this phase

至少需要准确表达：

- Windows 真机验证已完成并已被记录
- Windows 是正式产品目标，macOS 不是商用目标
- 公开发布仍是源码-only
- unsigned 安装包不是可信公开安装包
- 工作区未加密、PIN 边界、自动恢复点边界等残余风险仍存在

---

## 6. Tasks

- 冻结无签名条件下的公开边界和术语。
- 冻结证据沿用/补跑判断规则。
- 冻结版本切点默认策略。
- 冻结 Windows CI 和产物校验的最低要求。

## Automated Verification

- Contract review only; no source edits.
- Verify the frozen contracts remain consistent with `AGENTS.md`, `README.md`, `SECURITY.md`, and `package.json` before handoff.

## Completion Evidence

- Shared contract diff
- Recorded version strategy (`2.0.1` by default unless explicitly revised)
- Recorded unsigned/public-boundary rule
- Recorded evidence carry-forward rule

## Deviations

- Any request to publish public Windows executables without a signed channel is a contract violation and must trigger re-planning.
