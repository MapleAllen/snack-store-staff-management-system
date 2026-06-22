# Review, Main-Branch Handoff, and Closure

## Review Inputs

- `01-shared-contracts` 冻结后的接口与错误契约
- Windows 实现差异
- 新增或变更测试结果
- Windows 真机证据
- 文档同步差异
- 最终 CI 结果
- 残余风险和偏差清单

## Windows Codex Review

Status: NOT STARTED
Blocking findings:

- 数据损坏是否仍会静默回退演示数据。
- 保存失败是否可能伪装为“已自动保存”。
- PIN 校验是否只是前端状态，没有真正受控的桌面持久化和验证边界。
- 备份口令保护是否只是 UI 包装，没有真实保护。
- 旧数据迁移是否可能丢失月结快照、调店、离职、规则历史。
- 新增 IPC 是否扩大渲染进程权限面。
- backup reason 常量是否真正统一。

## macOS Codex Review

Status: NOT STARTED
Blocking findings:

- 文档是否准确表达 Windows 首发边界。
- `README.md`、`SECURITY.md`、`docs/data-safety.md` 是否与实现一致。
- Web 开发预览边界是否清楚。
- CI 表述是否错误暗示“CI 通过等于桌面行为已验证”。

## Plan Compliance

- 一次只允许一个 active implementation owner。
- 每个实现 owner 在 source edits 前必须记录 pulled `main` SHA。
- 未列入 allowed files 的文件若必须改动，先停工改计划。
- 若 Windows 真机行为与合同假设冲突，先更新计划，不带着假设继续写代码。
- 若当前脏工作区与任务冲突，必须先确认归属和边界。

## Documentation Updates

- `README.md`
- `docs/architecture.md`
- `docs/data-safety.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- additional Windows release or recovery docs if needed

## Main-Branch Handoff Order

1. 计划合同提交到 `main`。
2. `01-shared-contracts` 锁定并提交。
3. `02-windows` 实现、审查、提交。
4. `03-macos` 文档和流程同步、审查、提交。
5. `04-verification` 状态更新并确认最终证据。
6. `05-review-and-integration` 填写 closure gate。
7. 将功能目录移入 `plan/completed/`。

## Rollback Plan

- 若新工作区文件存储在 Windows 上出现阻断问题，回退到上一个稳定 `main` SHA。
- 不删除用户旧 `localStorage` 迁移来源，至少保留一个桥接版本周期。
- 若 PIN 或受保护备份实现存在阻断缺陷，允许阶段性回滚该能力，但不得回退损坏保护修复。
- 若文档与实现不一致，先阻止关闭，不以“后补文档”通过集成门。

## Final Integration Gate

- [ ] Shared and platform-specific tests pass.
- [ ] Windows and macOS CI pass on the same final `main` SHA.
- [ ] Required target-host evidence is recorded.
- [ ] Blocking review findings are resolved.
- [ ] `docs/` reflects the implemented current state.
- [ ] Remaining risks and deviations are recorded.
- [ ] Windows first-launch, upgrade, recovery, and protected backup behaviors were verified on a real Windows host.
- [ ] Web preview support boundary is documented as development-only.
- [ ] One task owner was active at a time.
- [ ] Plan moved to `plan/completed/`.
