# Windows CI, Packaging, and Evidence Ingestion

Owner: Windows host
Dependencies: Shared contracts frozen
Working branch: `main`
Starting SHA: RESOLVE AND RECORD AFTER `01-shared-contracts` IS REVIEWED AND PUSHED

## Allowed Files

- `.github/workflows/*.yml`
- `package.json`
- new helper scripts under `scripts/`
- `plan/active/windows-unsigned-release-readiness/02-windows.md`
- temporary evidence notes only under `plan/active/windows-unsigned-release-readiness/`

## Do Not Modify

- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- `src/App.jsx`
- `src/storageAdapter.js`
- `src/payrollData.js`
- `src/pages/**`
- `src/components/**`
- `electron/**`
- `shared/**`
- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/**`

## Platform-Specific Functions and Behavior

- Windows CI 负责证明依赖安装、测试、构建和 unsigned 打包成功，不负责替代真机交互验证。
- `package:win` 和 `dist:win` 产物都必须保持 unsigned 状态，不引入付费签名依赖。
- 若 workflow 上传 Windows 产物，这些产物仅作为审查和验证证据，不得被描述为可信公开下载。
- 若为产物校验新增脚本，脚本必须在缺少预期构建产物时显式失败。

## Implementation Tasks

- 在 GitHub Actions 中增加 `windows-latest` job，运行 `npm ci`、`npm run check`、`npm run package:win`、`npm run dist:win`。
- 根据需要拆分或扩展现有 CI，使 Ubuntu、Windows、macOS 三个平台信号能在同一 SHA 上查看。
- 若需要，为 Windows 产物增加 SHA256/文件大小/文件名清单生成脚本。
- 固定 unsigned 产物命名与输出约定，确保版本号能从 `package.json` 对齐到产物。
- 记录 Windows 构建日志、产物列表和 workflow 运行证据。
- 若本阶段的 CI/打包改动触碰安装器行为，按共享合同决定是否补跑安装/升级/卸载相关真机检查。

## Automated Verification

- `npm run check`
- `npm audit --audit-level=high`
- Windows runner: `npm run package:win`
- Windows runner: `npm run dist:win`
- Validate any workflow YAML changes through successful Actions runs on `main`

## Windows Manual Verification

- 如果 `package.json` 或 workflow 改动影响安装器参数、产物布局或卸载行为，在真实 Windows x64 主机上至少补跑以下 smoke checks：
- 安装 unsigned NSIS 包并成功启动
- 升级安装后数据仍在
- 卸载并保留数据后重装，恢复路径清晰
- 若改动仅限 CI 编排、artifact 上传、hash 生成或版本元数据，则可沿用现有交互式桌面行为证据，但必须在 handoff 中写清依据

## Completion Evidence

- workflow run URLs or IDs
- Windows build logs summary
- unsigned artifact list and hashes/manifest
- note explaining whether existing real-host evidence was reused or partially re-run
- remaining Windows-specific risks

## Deviations and Remaining Risks

- unsigned Windows builds may trigger SmartScreen or reputation warnings; this is accepted for internal or controlled-candidate use only.
- If `dist:win` proves too slow or flaky in CI, record the exact blocker instead of silently dropping installer coverage.
