# macOS Coordination, Documentation Sync, and Version Alignment

Owner: Codex / macOS host
Dependencies: Shared contracts frozen; Windows CI/packaging changes reviewed at least once
Working branch: `main`
Starting SHA: RESOLVE AND RECORD AFTER `02-windows` IS REVIEWED AND PUSHED

## Allowed Files

- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/architecture.md`
- `docs/data-safety.md`
- `.github/workflows/*.yml` only if wording or comments need alignment after Windows changes
- new release or verification docs under `docs/`
- `plan/active/windows-unsigned-release-readiness/03-macos.md`

## Do Not Modify

- `src/**`
- `electron/**`
- `shared/**`
- `package.json`
- Windows workflow logic that is not required for wording consistency

## Platform-Specific Functions and Behavior

- macOS 不是本阶段的商用目标平台；其职责是文档同步、CI 说明校准、版本叙事收口和 Web 预览边界复核。
- 所有文档必须把“Windows 真机验证已完成”和“无 signed channel 因而公开发布仍源码-only”同时表达清楚。
- 不能因为 Windows 验证完成，就让文档误导读者认为项目已经提供可信公开 EXE。

## Implementation Tasks

- 更新 `README.md`，把当前边界从“等待 Windows 验证 + 签名”改为“Windows 验证已完成，但公开发布仍因无 signed channel 保持源码-only”。
- 更新 `SECURITY.md`，同步 unsigned 安装包边界、已完成验证事实和仍然存在的安全边界。
- 更新 `CONTRIBUTING.md`，要求未来平台行为变更附带目标主机证据，并说明 unsigned 产物只能作为验证/候选件。
- 更新 `CHANGELOG.md`，记录 post-`2.0.0` 的硬化落地、修复和验证完成，并对齐下一个版本号。
- 视需要新增 `docs/` 文档，记录 Windows 验证证据索引、unsigned 分发边界或发布操作说明。
- 复核 `docs/architecture.md` 和 `docs/data-safety.md`，确保它们不再暗示“Windows 证据缺失”，同时保留未加密工作区、PIN 边界、自动恢复点边界等现实限制。

## Automated Verification

- `npm run check`
- `npm audit --audit-level=high`
- Validate any workflow wording edits through successful CI on `main`

## macOS Manual Verification

- 运行本地 Web 开发预览，确认文档调整没有引入对 Web/桌面边界的错误叙述。
- 复核所有更新后的文档，确认没有把 unsigned Windows 产物描述成可信公开安装包。

## Completion Evidence

- document diff summary
- explicit list of updated current-state statements
- version/changelog alignment summary
- note confirming macOS remains non-commercial support only

## Deviations and Remaining Risks

- If docs cannot state Windows verification completion with concrete evidence references, do not close this task.
- If versioning scope grows beyond a patch release due to unrelated feature work, stop and update the shared contracts first.
