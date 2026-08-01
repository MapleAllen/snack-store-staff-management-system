# Attendance Page Plan

## Objective

提供可核对、可冻结、与工资一致的匿名考勤录入体验。

## Design Principles

- 任一修改必须使确认失效。
- 已月结月份只能先解锁再修改。
- 成员展示只使用匿名代号。

## Phase 1: Shared Payroll Entry — DONE

Completed work:

- 考勤与工资页共用月度记录。

## Phase 2: Shift Support — NOT STARTED

Remaining features:

- 增加班次模板、覆盖预警和导入校验。

## Implementation Rules

- Do not 写入成员个人信息。
- Do not 直接修改冻结快照。
- Do not 添加可输入姓名、联系方式或员工说明的自由文本字段；业务原因必须使用受控选项。

## Open Questions

- 是否需要门店级的考勤截止日期？
