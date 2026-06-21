# 架构说明

## 运行形态

应用由同一套 React 界面支持两种运行形态：

- Web 开发预览：Vite 提供页面，业务数据保存在浏览器 `localStorage`。
- Windows 桌面应用：Electron 加载 Vite 构建产物，并通过受限 preload API 提供本机自动备份能力。

Electron 保持 `nodeIntegration: false` 与 `contextIsolation: true`。渲染进程不直接获得 Node.js 文件系统权限。

## 主要模块

- `src/payrollData.js`：工作区版本、默认模板、规范化与旧数据迁移。
- `src/payrollLogic.js`：工资计算、输入校验、异常汇总与导出行生成。
- `src/workspaceOperations.js`：门店生命周期、员工调店、月结与解锁。
- `src/App.jsx`：应用状态、持久化、备份协调与业务弹窗。
- `shared/backup-format.js`：Web 与桌面共用的备份格式和结构校验。
- `electron/backup-store.cjs`：自动恢复点的写入、读取与保留策略。

## 核心数据关系

工作区以稳定员工 ID 为主键，通过按月生效的 assignment 关联门店。月度记录按 `月份 -> 门店 -> 员工` 组织；月结时写入冻结 snapshot，避免后续工资规则变化改写历史结果。

任何持久化结构变更都应提升 `WORKSPACE_VERSION`，补充迁移逻辑，并覆盖旧备份恢复测试。
