# 架构说明

## 运行形态

应用由同一套 React 界面支持两种运行形态：

- **Web 开发预览**：Vite 提供页面，业务数据保存在浏览器 `localStorage`。仅用于本地开发与界面调试，不作为正式产品模式。
- **Windows 桌面应用**：Electron 加载 Vite 构建产物，工作区数据由 Electron 主进程管理的本地文件存储，并通过受限 preload API 提供本机自动恢复点、工作区持久化和应用锁能力。

Electron 保持 `nodeIntegration: false`、`contextIsolation: true` 与 `sandbox: true`。渲染进程不直接获得 Node.js 文件系统权限。

## 主要模块

- `src/payrollData.js`：工作区版本、默认模板、规范化与旧数据迁移。
- `src/payrollLogic.js`：工资计算、输入校验、异常汇总与导出行生成。
- `src/workspaceOperations.js`：门店生命周期、员工调店、月结与解锁。
- `src/App.jsx`：应用状态、持久化、备份协调、锁屏控制与业务弹窗。
- `src/storageAdapter.js`：渲染层存储适配，自动区分桌面文件存储与浏览器 localStorage。
- `shared/backup-format.js`：Web 与桌面共用的备份格式、结构校验和备份原因常量。
- `electron/workspace-store.cjs`：桌面 canonical workspace file 的原子写入、读取与损坏检测。
- `electron/backup-store.cjs`：自动恢复点的写入、读取与保留策略。
- `electron/main.cjs`：IPC 协调，包括工作区、备份和应用锁处理。
- `electron/preload.cjs`：受限 context bridge，暴露 workspace、backup 和 lock API。

## 核心数据关系

工作区以稳定员工 ID 为主键，通过按月生效的 assignment 关联门店。月度记录按 `月份 -> 门店 -> 员工` 组织；月结时写入冻结 snapshot，避免后续工资规则变化改写历史结果。

桌面版工作区文件保存在 Electron 应用数据目录下，通过原子写入（临时文件 → rename）确保写入安全。文件结构复用备份信封格式，并附带完整性校验。

损坏工作区不会自动被演示数据替换，而是进入受控恢复模式，向用户提供从备份恢复、导出损坏数据或重置等选项。

## 桌面安全层

桌面版支持通过 4-6 位数字 PIN 进行应用访问锁。PIN 通过 PBKDF2 哈希后保存在本机，启动或手动锁定后需输入正确 PIN 方可进入工作区。手动备份支持可选的口令加密，导出后需口令方可恢复。

任何持久化结构变更都应提升 `WORKSPACE_VERSION`，补充迁移逻辑，并覆盖旧备份恢复测试。
