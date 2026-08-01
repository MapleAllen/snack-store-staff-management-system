# Employees Page Module Description

## Module Name

Employees-Page

## Purpose

管理匿名岗位成员的薪资配置、门店归属、调店记录和在岗状态，而不保存姓名、联系方式或证件信息。

## Current Implementation

`src/pages/EmployeesPage.jsx` 展示系统生成的成员代号和稳定系统编号。新增操作由 `App.jsx` 自动生成匿名代号；`migrateWorkspace()` 将旧工作区的成员展示名替换为匿名代号，同时保留工资和归属 ID 关联。

### Capabilities

- 以成员代号和系统编号搜索、筛选在岗、待设薪资和历史成员。
- 创建匿名岗位成员并进入初始薪资设置。
- 支持调店、离岗、恢复在岗和履历查看。
- 展示薪资组件和调薪记录，不收集个人档案字段。

## Architecture

页面是查询与操作入口；`App.jsx` 执行状态变更；工资逻辑解析月份归属。

### UI (`src/pages/`)

- `EmployeesPage.jsx`
  - 表格、筛选器和匿名成员履历抽屉。

### Integration Points

- `src/payrollData.js`
  - `createAnonymousMemberCode()` 和 `migrateWorkspace()`。
- `src/payrollLogic.js`
  - 成员归属与履历查询函数。
- `src/workspaceOperations.js`
  - `transferEmployee()`。

## Current Limitations

- 成员代号不可自定义。
- 离岗仍使用日期记录，未提供排班替班功能。

## Future Directions

- Add 按岗位类别而非身份信息统计人力覆盖。
- Add 匿名班次模板与缺岗预警。

## Privacy Safeguards (v12)

调店履历和薪资调整履历只保留预设业务原因。迁移会丢弃旧的调店备注与调薪备注，并把历史成员显示名标准化为匿名成员代号。
