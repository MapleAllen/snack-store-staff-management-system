# commercial-readiness-roadmap Overview

Created: 2026-07-01
Status: ACTIVE
Coordination owner: OpenCode / macOS host
Working branch: `main`

## Goal

将门店工资助手从“本地单机工资助手 + 源码发布边界”推进到“可进入受控商业化准备”的路线：业务上补齐工资、人员、门店、报表与审计闭环；技术上补齐本地数据安全、桌面验证、签名发布和文档证据链。

## Scope

- 同步 `docs/` 现有模块事实，使 Description 只描述当前实现。
- 新增产品能力模块文档：工资管理、人员管理、门店管理、经营总览、报表导出、商业化准备。
- 建立后续多阶段商业化路线，明确每阶段目标、子目标、验收信号和非目标。
- 保留当前本地单机、Windows-first、源码-only 公共发布边界，直到签名发布通道和真实设备回归流程建立。
- 为未来实现代理提供明确执行入口，不要求本阶段实现业务代码。

## Non-Goals

- 不在本阶段修改 `src/**`、`electron/**`、`shared/**` 运行时代码。
- 不引入云同步、账号体系、多人协作、自动更新或远程服务。
- 不把 unsigned Windows 构建描述为可信公开安装包。
- 不承诺当前版本可直接用于真实发薪决策。
- 不把 macOS 桌面体验升级为商用目标。

## Current-State Evidence

- 当前产品能力、发布边界和开发命令记录在 `README.md`。
- 运行架构和商业化缺口记录在 `docs/architecture.md`。
- 数据安全、备份、PIN 和明文存储边界记录在 `docs/data-safety.md`。
- 技术模块当前事实记录在 `docs/Payroll-Data/`、`docs/Payroll-Logic/`、`docs/Workspace-Operations/`、`docs/Storage-Adapter/`、`docs/Backup-System/`、`docs/Desktop-Security/`。
- 产品能力路线记录在 `docs/Payroll-Management/`、`docs/Employee-Management/`、`docs/Store-Management/`、`docs/Overview-Dashboard/`、`docs/Reports-And-Exports/`、`docs/Commercial-Readiness/`。
- Windows unsigned 发布收口仍由 `plan/active/windows-unsigned-release-readiness/` 单独跟踪。

## Invariants

- `docs/` 是当前事实；`plan/` 是执行意图和阶段路线。
- 任何工作区 schema 变更必须更新 `WORKSPACE_VERSION`、迁移逻辑、备份校验、测试和文档。
- 已月结工资使用冻结 snapshot；不得用当前规则重算历史正式结果。
- 离职员工保留历史，但默认不进入活动工资、报表、导出和完成率。
- 门店只能停用/恢复，不能删除；最后一家营业门店不能停用。
- 新员工保持薪资待设置，直到三项薪资组件通过调整记录录入。
- 未签名发布通道建立前，公开发布保持源码-only。
- 默认演示数据只能使用泛化门店、虚构员工和演示金额。

## Phase Map

### Phase 1: Documentation Sync

目标：把当前模块文档更新到与代码一致，并建立产品能力模块文档。

子目标：修正技术模块事实漂移；新增产品模块 Description/Plan；同步架构和数据安全边界。

### Phase 2: Core Payroll Workflow

目标：将工资管理从可用闭环推进到可解释、可审计、可批量处理。

子目标：计算追踪、机器可读校验、结构化调整、考勤导入、批量月结、正式导出元数据。

### Phase 3: Employee and Store Operations

目标：补齐商业人员档案、门店配置、安全变更和 operation 层一致性。

子目标：员工商业字段、生命周期、门店元数据、规则变更预览、批量传播、操作审计。

### Phase 4: Reporting, Export, and Audit

目标：建立正式报表、导出包、趋势分析和审计证据。

子目标：多门店导出、manifest/hash、打印摘要、历史趋势、操作日志、支持用元数据导出。

### Phase 5: Desktop Security and Release

目标：补齐本地数据韧性、桌面安全增强和 Windows signed release 基础。

子目标：checksum、写前日志、多实例保护、可选工作区加密、PIN 恢复/自动锁、签名发布管线。

### Phase 6: Verification

目标：把自动化检查、Windows 真机验证、文档一致性和发布证据合并为可重复门禁。

子目标：测试矩阵、真机行为矩阵、导出/恢复/安装回归、证据索引、风险记录。

### Phase 7: Review and Integration

目标：阶段收口、风险接受、计划归档和下一阶段任务切分。

子目标：代码审查、文档审查、验收清单、残余风险、归档到 `plan/completed/`。

## Acceptance Criteria

- 现有模块 Description/Plan 与当前代码边界一致。
- 新产品模块文档覆盖工资、人员、门店、总览、报表导出和商业化准备。
- 每个商业化阶段都有总目标、子目标、验收信号和非目标边界。
- 计划不暗示当前已经具备 signed Windows 公开发布能力。
- 文档变更不修改运行时代码，并通过基础验证。

## Handoff Sequence

1. 完成本计划和模块文档更新。
2. 后续若执行 Phase 2，先分配工资工作流任务锁并限定允许文件。
3. Phase 3 只能在工资核心规则稳定后推进 operation 层重构。
4. Phase 4 依赖导出元数据和闭环审计结构。
5. Phase 5 的签名发布必须与 Windows unsigned release readiness 计划保持一致。
6. Phase 6 和 Phase 7 只在对应实现阶段完成后执行，不得提前标记完成。
