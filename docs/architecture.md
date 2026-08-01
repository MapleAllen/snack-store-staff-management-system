# 架构说明

门店工资助手是一个本地优先的工资管理工作区。Vite 用于本地界面开发，Electron 用于 Windows 桌面工作区、恢复点和应用锁；渲染层不直接访问文件系统。

## 工资领域模块

- `src/payrollData.js`：工作区版本、演示数据、月份记录和旧数据迁移。
- `src/payrollLogic.js`：工资计算、校验、月结阻塞、阶段汇总和工资 CSV 数据。
- `src/workspaceOperations.js`：门店归档、成员调店/离职、薪资调整、月结和解锁。
- `src/operationAudit.js`：最小化的门店、员工、薪资、月结操作时间线。
- `src/pages/HomePage.jsx`：工资待办与月结总览。
- `src/pages/EmployeesPage.jsx`、`AttendancePage.jsx`、`PayrollPage.jsx`、`ReportsPage.jsx`、`SettingsPage.jsx`：工资主流程页面。

应用仅加载这六个工资相关页面。商品、库存、采购、销售、费用、经营现金流和日结不属于产品架构。

## 数据关系和安全

成员通过稳定 ID 与按月份生效的门店归属关联。月度数据按“月份 → 门店 → 成员”组织；月结会写入冻结快照，后续薪资与规则变化不会改写已月结结果。桌面版在每日启动、恢复前和月结后创建本地恢复点。

数据保存在本地且未加密。应用不提供云同步或自动更新；公开发布保持源代码形式，直到具备签名 Windows 渠道和真实设备回归流程。
