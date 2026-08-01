# Payroll Page Module Description

## Module Name

Payroll-Page

## Purpose

为店主完成匿名成员的工资核对、确认、月结、解锁和导出。

## Current Implementation

`src/pages/PayrollPage.jsx` 先将原始工资行映射为带 `closeBlockers`、`issueItems` 和 `reviewStatus` 的展示行，再用于筛选和表格渲染，避免页面直接依赖未提供的派生字段。页面保留成员详情、结构化调整、公式拆解和月结操作。

### Capabilities

- 显示预计、已确认和月结状态。
- 支持成员代号搜索和状态筛选，筛选不再自动重置。
- 提供工资确认、调整、公式拆解、月结与解锁。

## Architecture

页面使用派生展示模型；`App.jsx` 处理持久化修改；`payrollLogic.js` 提供验证和状态计算。

### UI (`src/pages/`)

- `PayrollPage.jsx`
  - `payrollViewRows`：统一派生状态字段。
  - `visiblePayrollRows`：记忆化筛选结果。

### Integration Points

- `src/payrollLogic.js`
  - `getPayrollCloseBlockers()`、`getPayrollIssueItems()`、`getPayrollReviewStatus()`。
- `src/App.jsx`
  - 月结、解锁和工资输入操作。

## Current Limitations

- 没有付款状态或对外发薪接口。
- 单次仅处理一个门店月份。

## Future Directions

- Add 付款批次和导出清单。
- Add 多门店工资月结队列。

## Privacy Safeguards (v12)

工资调整、按月特殊调整与工资解锁均使用预设业务原因，不允许录入自由说明。旧工作区的调整备注、解锁说明和快照中的考勤备注会在加载时清理或替换为标准原因。
