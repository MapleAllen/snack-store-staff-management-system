# 架构说明

## 运行形态

门店工资助手由同一套 React 界面支持两种运行形态：

- **Web 开发预览**：Vite 提供页面，业务数据保存在浏览器 `localStorage`。此模式仅用于本地开发、界面调试和快速业务逻辑检查，不作为正式产品交付形态。
- **Windows 桌面应用**：Electron 加载 Vite 构建产物，工作区数据由 Electron 主进程管理的本地文件存储。桌面模式通过受限 preload API 提供工作区持久化、自动恢复点和应用访问锁能力。

Electron 保持 `nodeIntegration: false`、`contextIsolation: true` 与 `sandbox: true`。渲染进程不直接获得 Node.js 文件系统权限。

## 主要模块

- `src/payrollData.js`：工作区版本、默认门店配置、泛化演示模板、月度记录工厂和旧数据迁移。
- `src/payrollLogic.js`：工资计算、输入校验、员工归属查询、关闭阻塞、阶段汇总和 CSV 导出行生成。
- `src/workspaceOperations.js`：门店新增/改名/停用/恢复、员工按月调店、工资月结和原因解锁。
- `src/App.jsx`：应用状态编排、自动保存、备份恢复、锁屏控制、业务弹窗和仍未下沉到 operation 层的员工离职、调薪、门店规则更新处理。
- `src/pages/HomePage.jsx`：经营总览和老板下一步动作提示。
- `src/pages/EmployeesPage.jsx`：员工档案、在职/历史状态、调店入口和最近调薪摘要。
- `src/pages/AttendancePage.jsx`：本月考勤录入，与工资管理页面共享同一月度行数据。
- `src/pages/PayrollPage.jsx`：工资工作台、逐员工确认、异常复核、月结/解锁、调薪记录和工资构成明细。
- `src/pages/ReportsPage.jsx`：按月按门店汇总预计、已确认、已月结金额和阻塞/复核状态。
- `src/pages/SettingsPage.jsx`：门店管理、门店工资规则、备份恢复、自动恢复点和 PIN 设置。
- `src/storageAdapter.js`：渲染层存储适配，自动区分桌面文件存储与浏览器 `localStorage`。
- `shared/backup-format.js`：Web 与桌面共用的备份类型、存储键、备份原因常量、大小限制和基本结构校验。
- `electron/workspace-store.cjs`：桌面 canonical workspace file 的读取、结构校验、原子写入和损坏状态返回。
- `electron/backup-store.cjs`：自动恢复点的写入、读取、列出、每日去重和数量保留策略。
- `electron/main.cjs`：Electron 窗口安全设置、工作区 IPC、备份 IPC 和 PIN 锁 IPC。
- `electron/preload.cjs`：受限 context bridge，暴露 workspace、backup 和 lock API。

## 核心数据关系

工作区以稳定员工 ID 为主键。员工通过按月生效的 `assignments` 关联门店，员工调店时保留同一个员工 ID 并切分归属月份。

月度记录按 `月份 -> 门店 -> 员工` 组织。打开月份根据当前员工、门店规则和月度录入实时计算。月结时 `workspaceOperations.closeStoreMonth()` 写入冻结 `snapshot`，后续员工薪资或门店规则变化不会改写已月结结果。

薪资组件当前保存在员工记录中，但新员工初始薪资和后续调薪只能通过 `App.jsx` 的调薪记录流程更新。计划中的商业化重构会把调薪、离职和规则更新下沉到 `workspaceOperations.js`。

## 持久化与恢复

桌面版工作区文件保存在 Electron 应用数据目录下的 `workspace.json`。该文件复用备份信封格式，并通过临时文件写入后 `rename` 的方式降低半写入风险。

当前校验包含 JSON 解析、备份类型、存储键和基本工作区结构检查；尚未包含 SHA256 checksum、写前日志、多实例锁或加密工作区文件。

损坏工作区不会自动被演示数据替换，而是进入受控恢复模式。用户可从备份恢复、重置为泛化演示工作区，或在后续支持流程中保留现场。

## 桌面安全层

桌面版支持 4-6 位数字 PIN 应用访问锁。PIN 通过 PBKDF2 哈希和随机盐保存在 `lock.json`，启动时如果检测到 PIN 则先显示锁屏。PIN 不加密 `workspace.json` 或自动恢复点。

手动备份支持可选口令加密，使用 WebCrypto PBKDF2 + AES-GCM。自动恢复点仍以明文 JSON 保存在本机应用数据目录。

## 商业化架构缺口

- 人员资料仍偏轻量，缺少正式人事字段、证件/合同/银行卡管理和入职生命周期模型。
- 报表当前偏经营摘要，尚无完整财务报表、审计导出、批量多门店工资包或导出清单。
- 工资公式尚未版本化，缺少机器可读校验码、计算追踪、税费/扣款/补贴分类和有效日期规则。
- 部分业务 mutation 仍在 `App.jsx` 中，需要下沉到可测试 operation 层。
- 桌面发布仍缺 signed Windows channel、真实设备回归归档、自动更新决策和公开二进制发布流程。

## 变更规则

任何持久化结构变更都应提升 `WORKSPACE_VERSION`，补充迁移逻辑、备份校验、文档和测试。任何触碰桌面存储、备份、锁屏、恢复、安装器或发布边界的变更，都应附带对应 Windows 真机验证或明确记录为什么可以沿用现有证据。
