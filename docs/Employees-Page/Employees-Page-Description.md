# Employees Page Module Description

## Module Name

Employees-Page

## Purpose

管理员工的姓名、联系方式（手机号、工号、岗位、入职日期）、薪资配置、门店归属、调店记录和在岗状态，并支持随时编辑员工资料。

## Current Implementation

`src/pages/EmployeesPage.jsx` 展示员工姓名、工号、手机号、岗位与稳定系统编号。新增与编辑操作由 `App.jsx` 负责：新增时录入姓名（必填）、手机号、工号、岗位与入职日期；编辑资料调用 `updateEmployeeProfile()` 校验并写入员工字段，同时记录审计事件。`migrateWorkspace()` 保留旧工作区的成员展示名与工资、归属 ID 关联，不再强制改写为匿名代号。

### Capabilities

- 以姓名、工号、手机号或系统编号搜索、筛选在岗、待设薪资和历史员工。
- 新增员工并录入真实身份字段，进入初始薪资设置。
- 编辑员工资料（姓名、手机号、工号、岗位、入职日期），工号全工作区唯一。
- 支持调店、离岗、恢复在岗和资料与履历查看。
- 展示薪资组件和调薪记录。

## Architecture

页面是查询与操作入口；`App.jsx` 执行状态变更；工资逻辑解析月份归属。

### UI (`src/pages/`)

- `EmployeesPage.jsx`
  - 表格、筛选器、编辑资料入口和员工履历抽屉。

### Integration Points

- `src/payrollData.js`
  - `migrateWorkspace()` 与员工字段归一化。
- `src/payrollLogic.js`
  - 员工归属与履历查询函数。
- `src/workspaceOperations.js`
  - `updateEmployeeProfile()`、`transferEmployee()`。

## Current Limitations

- 离岗仍使用日期记录，未提供排班替班功能。

## Future Directions

- Add 按岗位类别统计人力覆盖。
- Add 班次模板与缺岗预警（如需）。
