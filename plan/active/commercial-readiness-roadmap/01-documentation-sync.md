# Documentation Sync

## Ownership

Owner: OpenCode / macOS host
Dependencies: None
Working branch: `main`
Status: IN PROGRESS

## Goal

让仓库文档准确表达当前实现、当前限制和商业化路线，避免后续开发基于过期行号、错误模块归属或未实现能力做决策。

## Allowed Files

- `docs/**`
- `plan/active/commercial-readiness-roadmap/**`

## Do Not Modify

- `src/**`
- `electron/**`
- `shared/**`
- `package.json`
- `.github/**`
- `README.md`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`，除非另行分配发布文档任务锁

## Tasks

- 更新技术模块 Description/Plan：Payroll Data、Payroll Logic、Workspace Operations、Storage Adapter、Backup System、Desktop Security。
- 新增产品模块 Description/Plan：Payroll Management、Employee Management、Store Management、Overview Dashboard、Reports and Exports、Commercial Readiness。
- 更新 `docs/architecture.md`，记录当前模块边界和商业化缺口。
- 更新 `docs/data-safety.md`，记录当前明文存储、PIN 边界、备份边界和操作建议。
- 创建本商业化路线计划目录和阶段文档。

## Completion Evidence

- `docs/` 中新增产品模块目录。
- 现有技术模块不再包含已知错误来源说明或过期行号引用。
- `plan/active/commercial-readiness-roadmap/` 包含 `00` 到 `07` 文档。
- `git diff --stat` 只显示文档和计划文件。

## Automated Verification

- `npm run check`，用于确认文档变更没有意外破坏构建或测试环境。
- `git status --short`，确认变更范围仅限文档和计划。

## Remaining Risks

- `README.md`、`SECURITY.md`、`CONTRIBUTING.md` 和 `CHANGELOG.md` 尚未在本任务中同步商业化路线；后续发布阶段需要单独处理。
- 文档路线不代表功能已经实现，后续每个阶段必须按实现计划单独验收。
