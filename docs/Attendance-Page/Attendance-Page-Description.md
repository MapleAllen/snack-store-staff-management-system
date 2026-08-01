# Attendance Page Module Description

## Module Name

Attendance-Page

## Purpose

为员工录入与工资相关的加班、请假、稽核和备注，并明确确认每条月度记录。

## Current Implementation

`src/pages/AttendancePage.jsx` 使用 `App.jsx` 提供的工资行和 `patchMonthlyEntry()` 写入月度记录，所有修改都会取消完成确认，已月结月份不可编辑。

### Capabilities

- 输入加班、请假、夜班、稽核和备注。
- 批量操作和逐员工确认。
- 跳转至工资页继续核对。

## Architecture

考勤页面不持有持久化状态，全部变更通过 App 层进入 `monthlyRecords`。

### UI (`src/pages/`)

- `AttendancePage.jsx`
  - 考勤输入表和批量确认操作。

### Integration Points

- `src/App.jsx`
  - `patchMonthlyEntry()`、`toggleEntryComplete()`。
- `src/payrollLogic.js`
  - 薪资行计算和验证。

## Current Limitations

- 没有班次排班表或外部考勤导入。
- 备注为自由文本，尚未提供结构化异常分类。

## Future Directions

- Add 班次模板。
- Add 考勤文件导入预览。

## Privacy Safeguards (v12)

考勤业务原因只能从预设选项中选择；不再提供员工备注自由文本。工作区加载迁移会移除旧考勤备注，月结快照也会按同一规则标准化。
