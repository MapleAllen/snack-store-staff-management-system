# Review, Main-Branch Handoff, and Closure

Closure date: PENDING
Final main SHA: PENDING

## Review Inputs

- `01-shared-contracts` 冻结：unsigned 公开边界、版本策略、CI 最低要求、证据沿用规则
- Windows implementation diff: PENDING
- macOS docs/version diff: PENDING
- Automated checks summary: PENDING
- Windows real-host evidence status: PENDING
- Remaining risks: see below

## Windows Review

Status: PENDING

Review focus:
- Windows workflow 是否在不引入签名的前提下稳定生成 unsigned 目录包和 NSIS 安装包
- CI 文案是否明确区分自动化信号和真机交互证据
- artifact manifest/hash 输出是否完整且在缺失产物时失败
- 若安装器或版本元数据有变化，是否正确判断了真机验证沿用还是补跑

Blocking findings: PENDING

## macOS Review

Status: PENDING

Review focus:
- `README.md`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`、`docs/` 是否准确表达“验证已完成但仍无 signed channel”
- 文档是否继续把 macOS 保持为开发/审查协调角色，而非商用目标
- 是否存在任何暗示可信公开 EXE 已可下载的措辞

Blocking findings: PENDING

## Plan Compliance

- [ ] 一次只允许一个 active implementation owner
- [ ] 每个 owner 在 source edits 前记录 pulled `main` SHA
- [ ] 未列入 allowed files 的文件未被改动
- [ ] 外部真机证据已明确映射到 SHA 和验证环境
- [ ] 如果运行时受影响文件发生变化，相关 Windows 检查已补跑

## Documentation Updates

- [ ] `README.md`
- [ ] `SECURITY.md`
- [ ] `CONTRIBUTING.md`
- [ ] `CHANGELOG.md`
- [ ] `docs/architecture.md`
- [ ] `docs/data-safety.md`
- [ ] Any new release/evidence docs needed for this phase

## Main-Branch Handoff Order

1. [ ] 计划合同提交
2. [ ] `01-shared-contracts` 锁定并提交
3. [ ] `02-windows` 实现、审查、提交
4. [ ] `03-macos` 文档与版本同步、审查、提交
5. [ ] `04-verification` 更新并确认证据沿用/补跑状态
6. [ ] `05-review-and-integration` 收口
7. [ ] 计划移动到 `plan/completed/`

## Rollback Plan

- 若 Windows CI 或打包改动不稳定，可回退到仅 Ubuntu CI 和现有本地 `package:win` / `dist:win` 状态，但必须保留真实边界文档，不得重新暗示“验证尚未完成”。
- 若文档同步出现歧义，以本阶段最终 review gate 中确认的措辞为准。
- 若版本切点判断错误，先修正版本/变更日志合同，再进行后续发布动作。

## Final Integration Gate

- [ ] Shared and platform-specific tests pass.
- [ ] Ubuntu, Windows, and macOS CI pass on the same final `main` SHA.
- [ ] Required target-host evidence is recorded and mapped to a SHA.
- [ ] Blocking review findings are resolved.
- [ ] `docs/` reflects the implemented current state.
- [ ] Remaining risks and deviations are recorded.
- [ ] Public release boundary remains source-only without a signed Windows channel.
- [ ] Any unsigned Windows artifacts are clearly documented as internal or controlled-candidate only.
- [ ] Plan moved to `plan/completed/`.

### Integration Gate Assessment

PENDING

## Remaining Risks and Deviations

| Risk | Severity | Status |
|---|---|---|
| No signed Windows channel; public EXE release still blocked | Medium | Expected / open |
| Unsigned installers may trigger SmartScreen or reputation warnings | Medium | Accepted for internal or controlled-candidate use |
| Existing Windows evidence may not align with final SHA if runtime files change | Medium | Guarded by carry-forward contract |
| CI proves packaging success, not interactive desktop correctness | Low | Documented limitation |
| Canonical workspace file remains unencrypted | Low | Documented product boundary |
| PIN forgotten-recovery remains unsupported | Low | Documented limitation |
