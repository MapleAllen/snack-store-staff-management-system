# Employees Page Plan

## Objective

在本地保存员工真实身份信息（姓名、手机号、工号、岗位、入职日期）的前提下，完成员工、工资和门店归属的可追溯管理。

## Design Principles

- 姓名必填，手机号、工号、岗位、入职日期可选。
- 不收集身份证件、地址或银行卡等超出工资管理范围的信息。
- 工资变更只能通过调薪记录完成。
- 员工资料修改通过 `updateEmployeeProfile()` 校验并记录审计事件。

## Phase 1: Employee Profiles — DONE

Completed work:

- 新增员工时录入真实姓名与联系方式字段。
- 员工管理页支持编辑资料（姓名、手机号、工号、岗位、入职日期）。
- 迁移保留真实姓名，不再覆盖为匿名代号。
- 工资单与导出中的成员代号列改为真实姓名，并新增工号、岗位、手机号列。

## Phase 2: Staffing Coverage — NOT STARTED

Remaining features:

- 增加岗位类别与班次覆盖统计。

## Implementation Rules

- Do not 允许页面直接编辑薪资组件。
- Do not 允许工号重复或手机号格式无效。
- Do not 保存调店或调薪自由备注；使用受控业务原因。

## Open Questions

- 岗位分类是否需要影响工资规则？
