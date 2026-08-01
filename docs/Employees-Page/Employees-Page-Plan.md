# Employees Page Plan

## Objective

在不保存个人身份信息的前提下完成岗位成员、工资和门店归属的可追溯管理。

## Design Principles

- 使用匿名成员代号和稳定 ID。
- 不增加姓名、电话、证件、地址或银行卡字段。
- 工资变更只能通过调薪记录完成。

## Phase 1: Anonymous Member Records — DONE

Completed work:

- 创建流程自动生成成员代号。
- 迁移过程标准化成员字段和历史快照展示名。

## Phase 2: Staffing Coverage — NOT STARTED

Remaining features:

- 增加岗位类别与匿名班次覆盖统计。

## Implementation Rules

- Do not 允许页面直接编辑薪资组件。
- Do not 接受自由文本姓名作为成员标识。
- Do not 保存调店或调薪自由备注；使用受控业务原因以避免间接个人信息。

## Open Questions

- 岗位分类是否需要影响工资规则？
