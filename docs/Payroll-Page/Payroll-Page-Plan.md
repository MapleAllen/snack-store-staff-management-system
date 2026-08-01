# Payroll Page Plan

## Objective

保持工资页在所有入口下可用、可解释，并严格执行确认和冻结边界。

## Design Principles

- 原始工资行与展示派生状态分离。
- 不因筛选动作改变用户输入。
- 每位成员须明确确认后才能月结。

## Phase 1: Render Reliability — DONE

Completed work:

- 统一工资展示行的派生状态。
- 修复总览跳转后的工资页崩溃。
- 修复搜索和筛选自动重置。

## Phase 2: Payment Handoff — NOT STARTED

Remaining features:

- 增加付款状态和导出清单。

## Implementation Rules

- Do not 假设 `getStorePayrollRows()` 返回页面派生字段。
- Do not 在已月结月份直接新增调整。
- Do not 用自由文本记录与成员相关的工资、调整或解锁原因；记录必须是可审计的标准选项。

## Open Questions

- 是否需要加入支付渠道对账？
