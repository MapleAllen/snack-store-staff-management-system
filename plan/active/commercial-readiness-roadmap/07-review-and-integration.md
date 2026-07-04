# Review and Integration

Closure date: PENDING
Final main SHA: PENDING
Status: NOT STARTED

## Goal

在每个商业化阶段完成后执行收口审查，确认实现、文档、测试、Windows 证据和发布边界一致，再决定归档或进入下一阶段。

## Review Inputs

- Phase implementation diff: PENDING
- Updated module docs: PENDING
- Automated checks: PENDING
- Manual verification evidence: PENDING
- Windows evidence if applicable: PENDING
- Remaining risks: PENDING

## Review Focus

- 当前阶段是否只修改允许文件。
- 是否存在未计划的产品范围扩张。
- `docs/` 是否准确表达当前实现，而不是未来意图。
- `plan/` 是否保留未完成工作，而不是删除待办。
- 数据安全和发布边界是否仍然诚实明确。
- 测试是否覆盖本阶段核心风险。
- Windows 真机证据是否按需补齐。

## Documentation Updates

- [ ] Updated affected module Description documents.
- [ ] Updated affected module Plan documents.
- [ ] Updated `docs/architecture.md` if module boundaries changed.
- [ ] Updated `docs/data-safety.md` if storage, backup, security, or release boundaries changed.
- [ ] Updated `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, or `CHANGELOG.md` if release-facing facts changed.

## Final Integration Gate

- [ ] `npm run check` passes.
- [ ] Required targeted tests pass.
- [ ] Required Windows real-device evidence is recorded or explicitly not required.
- [ ] No public binary trust claim exists without signed channel.
- [ ] Closed payroll snapshot semantics are preserved.
- [ ] Backup/recovery behavior is not weakened.
- [ ] Resigned employee exclusion rule is preserved.
- [ ] Remaining risks are recorded.

## Archive Criteria

- All completed phase evidence is recorded.
- Blocking review findings are resolved.
- Future work is represented as remaining features in the relevant module plan.
- The active plan can be moved to `plan/completed/` only after its scope is actually implemented or intentionally closed.

## Rollback Plan

- If a phase expands beyond its allowed files or non-goals, stop implementation and revise the active plan first.
- If automated checks fail, fix or revert only the changes owned by that phase.
- If Windows evidence contradicts docs, update docs and defer release claims.
- If a signed release path is not ready, keep public release source-only.

## Remaining Risks and Deviations

| Risk | Severity | Status |
|---|---|---|
| Signed Windows channel not yet available | High | Open |
| Workspace and automatic backups remain plaintext | Medium | Open |
| Commercial employee/payroll scope not finalized | Medium | Open |
| Some business mutations still live in `App.jsx` | Medium | Open |
| Windows real-device verification depends on external host | Medium | Open |
