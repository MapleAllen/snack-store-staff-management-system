# windows-unsigned-release-readiness Overview

Created: 2026-06-22
Status: DRAFT
Coordination owner: Codex / macOS host
Working branch: `main`

## Goal

在不引入付费代码签名的前提下，把项目从“Windows 真机验证已完成但仓库事实和发布流程未收口”推进到“验证证据可追溯、跨平台 CI 完整、Windows unsigned 构建可重复、公开边界清晰”的下一阶段。

## Scope

- 把已完成的 Windows 真机验证结果回写到仓库可审计证据中。
- 建立同一 `main` SHA 上的 Ubuntu、Windows、macOS 自动化检查闭环。
- 将 Windows 打包从“本地手工能力”推进到“CI 可重复生成 unsigned 构建产物和校验信息”。
- 明确 unsigned Windows 安装包仅用于内部验证或受控候选分发，不作为可信公开 EXE 发布。
- 同步 `README.md`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`、`docs/`，使其反映“真机验证已完成，但仍无 signed channel”的当前事实。
- 评估并固定下一个版本切点，默认优先采用补丁版本发布。

## Non-Goals

- 不采购、不接入付费代码签名服务。
- 不把 unsigned Windows 安装包描述为可信公开安装包。
- 不引入自动更新、云同步、账号体系或多人协作。
- 不改变当前工资业务规则、月结语义、备份格式或工作区数据结构。
- 不把 macOS 桌面体验升级为商用目标。
- 不进行大规模 UI 重设计。

## Current-State Evidence

- 仓库规则仍要求“signed Windows channel + real-device regression process”同时存在前，公开发布保持源码-only：`AGENTS.md:21-23`
- `README.md` 仍声明 GitHub Release 目前只发布源码，公开安装包需要代码签名和真实 Windows x64 回归：`README.md:30-34`
- `SECURITY.md` 仍声明当前不发布 Windows 可执行文件：`SECURITY.md:11-19`
- 当前 CI 只有 Ubuntu runner，无法在仓库内证明 Windows/macOS 构建状态：`.github/workflows/ci.yml:1-37`
- `package.json` 已具备 `package:win` 和 `dist:win`，但没有签名接线、制品校验信息或自动上传流程：`package.json:21-30`, `package.json:41-76`
- 已归档的上一阶段验证文档仍写明 Windows manual checks `NOT RUN`，与当前“真机验证已完成”的外部事实不一致：`plan/completed/desktop-commercial-hardening/04-verification.md:19-35`, `plan/completed/desktop-commercial-hardening/04-verification.md:57-66`
- 已归档的上一阶段集成门仍是 conditional close，并把 Windows host evidence 作为唯一明确缺口：`plan/completed/desktop-commercial-hardening/05-review-and-integration.md:94-111`
- 当前 `package.json` 和 `CHANGELOG.md` 仍停留在 `2.0.0`，未体现硬化收尾与后续修复：`package.json:1-30`, `CHANGELOG.md:1-10`

## Invariants

- `docs/` 是当前事实，`plan/` 只是执行意图。
- 所有工作继续在 `main` 顺序推进，一次只有一个 active task owner。
- 公开发布边界在没有 signed Windows channel 前保持源码-only；本阶段不得通过文档、CI 或产物命名暗示“可信公开 EXE 已提供”。
- Windows 仍是唯一正式产品目标；macOS 仅用于开发、审查和文档协调。
- 现有 Electron 安全边界不得放宽：`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`：`docs/architecture.md:7-10`
- 工作区未加密、PIN 非 OS 级隔离、自动恢复点明文保存等残余风险必须继续显式记录：`docs/data-safety.md:15-20`, `SECURITY.md:13-24`
- 月结快照冻结语义、离职员工排除规则、旧备份兼容路径不可改变。

## Dependencies

- 先冻结“unsigned 分发边界、证据沿用规则、版本策略、CI 目标”这些共享合同，再推进平台实现。
- 关闭本阶段前，必须把外部完成的 Windows 真机验证证据落到仓库可审计记录中。
- 如果 Windows 打包配置改动触碰安装器行为或桌面运行路径，必须按共享合同判断是否需要重跑对应真机检查。

## Risks and Unknowns

- 无签名安装包会触发 SmartScreen 或杀软信誉警告，因此不能被包装成面向公众的可信下载。
- 现有真机验证证据若对应的 SHA 与最终收口 SHA 不同，需要明确判断哪些证据可沿用、哪些必须重跑。
- Windows CI 可以验证打包成功，但不能替代交互式桌面行为证明。
- 若版本号、Changelog、验证证据和最终发布说明不同步，容易造成“代码状态已前进，但仓库叙事仍停留在旧阶段”的混乱。

## Acceptance Criteria

- `README.md`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`、`docs/` 与“Windows 真机验证已完成、但仍无 signed channel”这一当前事实一致。
- Ubuntu、Windows、macOS 自动化检查在同一最终 `main` SHA 上通过，并明确区分“自动化信号”和“真机交互证据”。
- Windows CI 能生成 unsigned 目录构建和 unsigned NSIS 安装包，并输出可审计的产物清单或校验信息。
- Windows 真机验证证据被记录到仓库，并与对应 SHA、设备环境、验证人、验证日期相关联。
- 若最终 SHA 相比已验证 SHA 触碰受影响运行时文件，则相关 Windows 检查被重跑并记录。
- 公开发布边界仍保持源码-only；任何 unsigned Windows 产物都被明确标记为内部验证或受控候选用途。
- 下一个版本切点被明确记录，且不引入与本阶段无关的产品能力扩张。

## Main-Branch Handoff Sequence

1. 先提交本计划合同更新。
2. 分配 `01-shared-contracts` 任务锁，冻结 unsigned 分发、证据沿用、版本和 CI 合同。
3. 审核并提交共享契约后，再分配 `02-windows` 任务锁实现 Windows CI、打包和制品校验流程。
4. Windows 变更经审查和提交后，再分配 `03-macos` 任务锁同步文档、版本说明和支持边界。
5. 之后执行 `04-verification` 记录真机证据并判断是否需要补跑。
6. 最后执行 `05-review-and-integration` 收口并归档计划。
7. 任何阶段若发现必须突破“源码-only 公开边界”或需要新增 signed channel，停止实现，先修订计划再继续。
