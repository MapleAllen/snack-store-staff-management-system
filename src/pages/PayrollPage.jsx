import { useState } from "react";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import {
  entryHasDraftChanges,
  formatCurrency,
  formatTimestamp,
  createEmployeeDraft,
  entryHasInput,
  getPayrollCloseBlockers,
  getPayrollChangeItems,
  getPayrollIssueItems,
  getPayrollReviewStatus,
} from "../payrollLogic.js";
import { VIEW_OPTIONS } from "../payrollData.js";

const ENTRY_FIELD_LABELS = {
  overtimeHours: "加班时长",
  leaveDays: "请假天数",
  leaveHours: "请假小时",
  nightShiftHours: "夜班时长",
  specialAdjustment: "特殊加减项",
};

const TRACE_GROUPS = [
  { id: "base", label: "基础项" },
  { id: "deduction", label: "扣减追踪" },
  { id: "addition", label: "增加追踪" },
  { id: "total", label: "实发汇总" },
];

const TRACE_SOURCE_LABELS = {
  "employee.baseSalary": "员工基础工资",
  "employee.overtimeRate": "员工加班时薪",
  "employee.attendanceBonus": "员工全勤奖金",
  "entry.overtimeHours": "本月加班时长",
  "entry.leaveDays": "本月请假天数",
  "entry.leaveHours": "本月请假小时",
  "entry.nightShiftHours": "本月夜班时长",
  "entry.auditPassed": "本月稽核状态",
  "entry.specialAdjustment": "本月特殊加减项",
  "config.leaveDaysDivisor": "门店请假天数除数",
  "config.leaveHoursDivisor": "门店请假小时除数",
  "config.monthDays": "门店每月计薪天数",
  "config.nightShiftRate": "门店夜班补贴",
  "config.auditPassedBonus": "门店稽核达标奖励",
  "config.auditFallbackBonus": "门店稽核未达标保底",
  "config.socialInsuranceBase": "门店社保补助基数",
  "config.mealAllowanceBase": "门店饭补基数",
  "breakdown.leaveDaysDeduction": "请假天数扣减结果",
  "breakdown.leaveHoursDeduction": "请假小时扣减结果",
  "breakdown.overtimePay": "加班工资结果",
  "breakdown.nightShiftPay": "夜班补贴结果",
  "breakdown.attendancePay": "全勤奖金结果",
  "breakdown.auditPay": "稽核奖金结果",
  "breakdown.socialInsurance": "社保补助结果",
  "breakdown.mealAllowance": "饭补结果",
  "breakdown.specialAdjustment": "特殊加减项结果",
};

function formatTraceValue(value) {
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(4))}`;
  return `${value ?? ""}`;
}

function formatTraceAmount(step) {
  const prefix = step.group === "deduction" ? "- " : step.group === "addition" && step.amount >= 0 ? "+ " : "";
  return `${prefix}${formatCurrency(step.amount)}`;
}

function formatTraceRounding(step) {
  if (!step.rounding?.applied) return "未额外取整";
  if (step.rawValue === step.amount) return "按两位小数保留，金额未变化";
  return `原始值 ${formatTraceValue(step.rawValue)}，按两位小数取整`;
}

export function PayrollPage({
  activeStore,
  activeMonth,
  setActiveMonth,
  exportCurrentMonth,
  totalNetSalary,
  forecastNetSalary,
  payrollRows,
  touchedRows,
  exceptionCount,
  completionRate,
  monthlyStore,
  selectedRow,
  setSelectedEmployeeId,
  patchMonthlyEntry,
  toggleEntryComplete,
  setEmployeeModal,
  openAdjustmentModal,
  isLocked,
  onClosePayroll,
  onUnlockPayroll,
}) {
  const [activeView, setActiveView] = useState("payroll");
  const [searchTerm, setSearchTerm] = useState("");
  const [payrollFilter, setPayrollFilter] = useState("all");

  const reviewedRows = payrollRows.map((row) => ({
    ...row,
    closeBlockers: getPayrollCloseBlockers(row),
    issueItems: getPayrollIssueItems(row),
    changeItems: getPayrollChangeItems(row, activeStore.config),
    hasDraftChanges: entryHasDraftChanges(row.entry),
    reviewStatus: getPayrollReviewStatus(row),
  }));
  const selectedReviewRow =
    reviewedRows.find((row) => row.employee.id === selectedRow?.employee.id) ??
    (selectedRow
      ? {
          ...selectedRow,
          closeBlockers: getPayrollCloseBlockers(selectedRow),
          issueItems: getPayrollIssueItems(selectedRow),
          changeItems: getPayrollChangeItems(selectedRow, activeStore.config),
          hasDraftChanges: entryHasDraftChanges(selectedRow.entry),
          reviewStatus: getPayrollReviewStatus(selectedRow),
        }
      : null);
  const issueRows = reviewedRows.filter((row) => row.issueItems.length > 0);
  const pendingRows = reviewedRows.filter((row) => !entryHasInput(row.entry));
  const unconfiguredRows = reviewedRows.filter((row) => !row.employee.salaryConfigured);
  const invalidRows = reviewedRows.filter((row) => row.validationIssues.length > 0 && row.employee.salaryConfigured);
  const blockerRows = reviewedRows.filter((row) => row.closeBlockers.length > 0);
  const topPriorityBlockers = blockerRows.slice(0, 3);
  const draftRows = reviewedRows.filter((row) => !row.entry.isComplete && row.hasDraftChanges && row.closeBlockers.length === 1 && row.closeBlockers[0] === "已录入但还未确认完成");
  const untouchedRows = reviewedRows.filter((row) => !row.entry.isComplete && !row.hasDraftChanges && row.validationIssues.length === 0 && row.employee.salaryConfigured);
  const readyToClose = !isLocked && reviewedRows.length > 0 && blockerRows.length === 0;
  const controlState = isLocked
    ? { tone: "success", title: "本月工资已冻结", description: "当前结果已经完成月结，如需修改请填写原因后解锁。", actionLabel: "申请解锁" }
    : blockerRows.length > 0
      ? { tone: "warning", title: "当前还不能月结", description: `还有 ${blockerRows.length} 位员工阻塞本店月结，先处理最高优先级阻塞。`, actionLabel: "继续清理阻塞" }
      : issueRows.length > 0
        ? { tone: "warning", title: "当前可以月结，但建议先复核重点变化", description: `${issueRows.length} 位员工存在请假、调整或稽核未达标变化。`, actionLabel: "先复核重点变化" }
        : readyToClose
          ? { tone: "success", title: "当前可以直接月结", description: "所有员工都已确认完成，可以冻结本店本月工资。", actionLabel: "确认月结" }
          : { tone: "idle", title: "继续录入并逐个确认", description: "先完成录入和确认，再回到这里执行月结。", actionLabel: "继续录入" };

  const visiblePayrollRows = reviewedRows.filter((row) => {
    const matchesSearch = row.employee.name.includes(searchTerm.trim());
    if (!matchesSearch) {
      return false;
    }

    if (payrollFilter === "exceptions") {
      return row.issueItems.length > 0;
    }

    if (payrollFilter === "pending") {
      return !entryHasInput(row.entry);
    }

    if (payrollFilter === "unconfigured") {
      return !row.employee.salaryConfigured;
    }

    if (payrollFilter === "qualified") {
      return row.entry.auditPassed;
    }

    return true;
  }).sort((a, b) => {
    if (a.closeBlockers.length !== b.closeBlockers.length) {
      return b.closeBlockers.length - a.closeBlockers.length;
    }
    if (a.issueItems.length !== b.issueItems.length) {
      return b.issueItems.length - a.issueItems.length;
    }
    if (entryHasInput(a.entry) !== entryHasInput(b.entry)) {
      return entryHasInput(a.entry) ? -1 : 1;
    }
    return 0;
  });

  return (
    <>
      <header className="hero">
        <div className="hero__copy">
          <span className="hero__eyebrow">工资工作台</span>
          <h1>{activeStore.name}月结控制台</h1>
          <p>{isLocked ? `${activeMonth} 已完成月结，当前结果已冻结。` : `先清掉 ${blockerRows.length} 个阻塞，再逐个确认员工，最后执行本店月结。`}</p>
        </div>
        <div className="hero__controls">
          <div className="toolbar desktop-payroll-actions">
            <label className="field field--compact">
              <span>工资月份</span>
              <input type="month" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)} />
            </label>
            <button className="secondary-button" type="button" onClick={exportCurrentMonth}>{isLocked ? "导出正式工资表" : "导出草稿"}</button>
            {isLocked ? <button className="primary-button" type="button" onClick={onUnlockPayroll}>申请解锁</button> : <button className="primary-button" type="button" onClick={onClosePayroll}>确认月结</button>}
          </div>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard
          label="本店确认进度"
          value={`${touchedRows}/${payrollRows.length}`}
          hint={`完成率 ${completionRate}% · 草稿中 ${draftRows.length} 人`}
        />
        <StatCard
          label="月结阻塞"
          value={`${blockerRows.length} 人`}
          hint={`待确认 ${pendingRows.length} · 待设置 ${unconfiguredRows.length} · 输入有误 ${invalidRows.length}`}
          accent={blockerRows.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="待复核变化"
          value={`${exceptionCount} 人`}
          hint={`未动过 ${untouchedRows.length} 人 · 最近保存 ${formatTimestamp(monthlyStore.savedAt)}`}
          accent={exceptionCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label={isLocked ? "已月结实发" : "已确认实发"}
          value={formatCurrency(totalNetSalary)}
          hint={`预计实发 ${formatCurrency(forecastNetSalary)}`}
          accent="primary"
        />
      </section>

      <section className="workspace-grid">
        <div className="panel panel--main">
          <SectionHeading
            eyebrow={activeStore.name}
            title="工资录入工作台"
            description={isLocked ? "本月工资结果已冻结，可导出或填写原因后解锁。" : "完成每位员工录入确认后，即可执行本店本月月结。"}
            action={
              <div className="segmented-control" role="tablist" aria-label="工资工作台视图">
                {VIEW_OPTIONS.map((view) => (
                  <button
                    key={view.id}
                    className={view.id === activeView ? "segmented-control__item is-active" : "segmented-control__item"}
                    role="tab"
                    aria-selected={view.id === activeView}
                    type="button"
                    onClick={() => setActiveView(view.id)}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            }
          />

          {activeView === "payroll" ? (
            <>
            <div className={`exception-dock exception-dock--${controlState.tone}`}>
              <div>
                <span className="section-heading__eyebrow">本店月结状态</span>
                <strong>{controlState.title}</strong>
                <p>{controlState.description}</p>
              </div>
              <div className="exception-dock__actions">
                {topPriorityBlockers.length > 0 ? (
                  topPriorityBlockers.map((row) => (
                    <button
                      className="exception-chip"
                      key={row.employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(row.employee.id)}
                    >
                      <strong>{row.employee.name}</strong>
                      <span>{row.closeBlockers[0]}</span>
                    </button>
                  ))
                ) : (
                  <button className="exception-chip exception-chip--clear" type="button" onClick={isLocked ? onUnlockPayroll : onClosePayroll}>
                    <strong>{controlState.actionLabel}</strong>
                    <span>{isLocked ? "工资结果已冻结" : readyToClose ? "全部员工都已确认完成" : "当前没有阻塞，但建议继续复核"}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="confirmation-legend">
              <div><strong>确认完成才计入月结</strong><span>每位员工都要点一次“确认该员工完成”，哪怕本月没有变更。</span></div>
              <div><strong>修改后自动取消确认</strong><span>任何加班、请假、调整或备注被修改后，系统会自动回到待确认状态。</span></div>
              <div><strong>重点变化仍建议复核</strong><span>请假、特殊调整和稽核未达标不会阻止录入，但建议老板抽查。</span></div>
            </div>
            <div className="table-shell table-shell--payroll">
              <div className="table-toolbar table-toolbar--filters">
                <label className="field field--toolbar">
                  <span>搜索姓名</span>
                  <input
                    value={searchTerm}
                    placeholder="搜索姓名"
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <label className="field field--toolbar">
                  <span>筛选状态</span>
                  <select value={payrollFilter} onChange={(event) => setPayrollFilter(event.target.value)}>
                    <option value="all">全部在职员工</option>
                    <option value="exceptions">需复核优先</option>
                    <option value="pending">仅看待录入</option>
                    <option value="unconfigured">仅看薪资待设置</option>
                    <option value="qualified">仅看稽核达标</option>
                  </select>
                </label>
              </div>
              <table className="payroll-table">
                <thead>
                  <tr className="column-group-row">
                    <th colSpan="2">固定信息</th>
                    <th colSpan={activeStore.config.nightShiftRate > 0 ? "4" : "3"}>考勤输入</th>
                    <th colSpan="4">结果确认</th>
                  </tr>
                  <tr>
                    <th>姓名</th>
                    <th>底薪</th>
                    <th>加班</th>
                    <th>请假天</th>
                    <th>请假时</th>
                    {activeStore.config.nightShiftRate > 0 ? <th>夜班</th> : null}
                    <th>稽核</th>
                    <th>调整</th>
                    <th>员工确认</th>
                    <th>实发工资</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePayrollRows.map((row) => (
                    <tr
                      key={row.employee.id}
                      className={[
                        row.employee.id === selectedRow?.employee.id ? "is-selected" : "",
                        row.issueItems.length > 0 ? "has-issues" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => setSelectedEmployeeId(row.employee.id)}
                    >
                      <td className="col-static">
                        <div className="employee-cell">
                          <strong>{row.employee.name}</strong>
                          <span>{formatCurrency(row.employee.baseSalary)}</span>
                          <span className={`status-badge status-badge--${row.reviewStatus.tone}`}>{row.reviewStatus.label}</span>
                          <span className={row.closeBlockers.length > 0 ? "row-issue-label" : ""}>{row.closeBlockers[0] ?? row.issueItems[0] ?? "确认后才能计入月结"}</span>
                        </div>
                      </td>
                      <td className="col-static">{row.employee.baseSalary}</td>
                      <td className="col-attendance">
                        <input disabled={isLocked}
                          className="cell-input"
                          type="number"
                          min="0"
                          step="0.5"
                          aria-invalid={row.entry.overtimeHours !== "" && Number(row.entry.overtimeHours) < 0}
                          aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.overtimeHours}`}
                          value={row.entry.overtimeHours}
                          onChange={(event) => patchMonthlyEntry(row.employee.id, { overtimeHours: event.target.value })}
                        />
                      </td>
                      <td className="col-attendance">
                        <input disabled={isLocked}
                          className="cell-input"
                          type="number"
                          min="0"
                          step="0.5"
                          aria-invalid={row.entry.leaveDays !== "" && Number(row.entry.leaveDays) < 0}
                          aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.leaveDays}`}
                          value={row.entry.leaveDays}
                          onChange={(event) => patchMonthlyEntry(row.employee.id, { leaveDays: event.target.value })}
                        />
                      </td>
                      <td className="col-attendance">
                        <input disabled={isLocked}
                          className="cell-input"
                          type="number"
                          min="0"
                          step="0.5"
                          aria-invalid={row.entry.leaveHours !== "" && Number(row.entry.leaveHours) < 0}
                          aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.leaveHours}`}
                          value={row.entry.leaveHours}
                          onChange={(event) => patchMonthlyEntry(row.employee.id, { leaveHours: event.target.value })}
                        />
                      </td>
                      {activeStore.config.nightShiftRate > 0 ? (
                        <td className="col-attendance">
                          <input disabled={isLocked}
                            className="cell-input"
                            type="number"
                            min="0"
                            step="0.5"
                            aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.nightShiftHours}`}
                            value={row.entry.nightShiftHours}
                            onChange={(event) => patchMonthlyEntry(row.employee.id, { nightShiftHours: event.target.value })}
                          />
                        </td>
                      ) : null}
                      <td className="col-result">
                        <button
                          className={row.entry.auditPassed ? "pill-toggle is-active" : "pill-toggle"}
                          disabled={isLocked}
                          type="button"
                          aria-label={`${row.employee.name} 稽核状态`}
                          aria-pressed={row.entry.auditPassed}
                          onClick={(event) => {
                            event.stopPropagation();
                            patchMonthlyEntry(row.employee.id, { auditPassed: !row.entry.auditPassed });
                          }}
                        >
                          {row.entry.auditPassed ? "达标" : "未达标"}
                        </button>
                      </td>
                      <td className="col-result">
                        <input disabled={isLocked}
                          className="cell-input"
                          type="number"
                          step="10"
                          aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.specialAdjustment}`}
                          value={row.entry.specialAdjustment}
                          onChange={(event) => patchMonthlyEntry(row.employee.id, { specialAdjustment: event.target.value })}
                        />
                      </td>
                      <td className="col-result">
                        <div className="completion-cell">
                          <button
                            className={row.entry.isComplete ? "completion-button completion-button--strong is-complete" : "completion-button completion-button--strong"}
                            type="button"
                            disabled={isLocked || (!row.entry.isComplete && row.validationIssues.length > 0) || !row.employee.salaryConfigured}
                            title={row.validationIssues[0]}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleEntryComplete(row.employee.id, !row.entry.isComplete);
                            }}
                          >
                            {row.entry.isComplete ? "已确认完成" : "确认该员工完成"}
                          </button>
                          <small>{row.entry.isComplete ? `确认时间 ${formatTimestamp(row.entry.completedAt)}` : row.closeBlockers[0] ?? "确认后该员工才算本月完成"}</small>
                        </div>
                      </td>
                      <td className="currency-cell col-result">{row.employee.salaryConfigured ? formatCurrency(row.breakdown.netSalary) : "待设置"}</td>
                    </tr>
                  ))}
                  {visiblePayrollRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeStore.config.nightShiftRate > 0 ? "10" : "9"} className="empty-cell">
                        没有符合筛选条件的员工。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="mobile-payroll-list">
              {visiblePayrollRows.map((row) => (
                <article
                  className={row.closeBlockers.length > 0 || row.issueItems.length > 0 ? "mobile-payroll-card mobile-payroll-card--warning" : "mobile-payroll-card"}
                  key={row.employee.id}
                >
                  <button className="mobile-payroll-card__head" type="button" onClick={() => setSelectedEmployeeId(row.employee.id)}>
                    <span>
                      <strong>{row.employee.name}</strong>
                      <small>{row.reviewStatus.summary}</small>
                    </span>
                    <span className={`status-badge status-badge--${row.reviewStatus.tone}`}>{row.reviewStatus.label}</span>
                  </button>
                  <div className="mobile-payroll-card__amount">
                    <span>实发工资</span>
                    <strong>{row.employee.salaryConfigured ? formatCurrency(row.breakdown.netSalary) : "待设置"}</strong>
                  </div>
                  {row.closeBlockers.length > 0 || row.issueItems.length > 0 ? (
                    <div className="issue-tags">
                      {(row.closeBlockers.length > 0 ? row.closeBlockers : row.issueItems).map((item) => <span key={item}>{item}</span>)}
                    </div>
                  ) : null}
                  <div className="mobile-entry-grid">
                    <label className="field">
                      <span>加班</span>
                      <input disabled={isLocked}
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.overtimeHours}`}
                        value={row.entry.overtimeHours}
                        onChange={(event) => patchMonthlyEntry(row.employee.id, { overtimeHours: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>请假天</span>
                      <input disabled={isLocked}
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.leaveDays}`}
                        value={row.entry.leaveDays}
                        onChange={(event) => patchMonthlyEntry(row.employee.id, { leaveDays: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span>请假时</span>
                      <input disabled={isLocked}
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.leaveHours}`}
                        value={row.entry.leaveHours}
                        onChange={(event) => patchMonthlyEntry(row.employee.id, { leaveHours: event.target.value })}
                      />
                    </label>
                    {activeStore.config.nightShiftRate > 0 ? (
                      <label className="field">
                        <span>夜班</span>
                        <input disabled={isLocked}
                          type="number"
                          min="0"
                          step="0.5"
                          aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.nightShiftHours}`}
                          value={row.entry.nightShiftHours}
                          onChange={(event) => patchMonthlyEntry(row.employee.id, { nightShiftHours: event.target.value })}
                        />
                      </label>
                    ) : null}
                    <label className="field">
                      <span>调整</span>
                      <input disabled={isLocked}
                        type="number"
                        step="10"
                        aria-label={`${row.employee.name} ${ENTRY_FIELD_LABELS.specialAdjustment}`}
                        value={row.entry.specialAdjustment}
                        onChange={(event) => patchMonthlyEntry(row.employee.id, { specialAdjustment: event.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    className={row.entry.auditPassed ? "pill-toggle is-active" : "pill-toggle"}
                    disabled={isLocked}
                    type="button"
                    aria-label={`${row.employee.name} 稽核状态`}
                    aria-pressed={row.entry.auditPassed}
                    onClick={() => patchMonthlyEntry(row.employee.id, { auditPassed: !row.entry.auditPassed })}
                  >
                    {row.entry.auditPassed ? "稽核达标" : "稽核未达标"}
                  </button>
                  <div className="mobile-confirmation-card">
                    <strong>本员工确认</strong>
                    <p>{row.entry.isComplete ? "这名员工本月已经确认完成。" : row.closeBlockers[0] ?? "确认后，该员工才会从月结阻塞里消失。"}</p>
                    <button className={row.entry.isComplete ? "completion-button completion-button--strong is-complete" : "completion-button completion-button--strong"} type="button" disabled={isLocked || (!row.entry.isComplete && row.validationIssues.length > 0) || !row.employee.salaryConfigured} title={row.validationIssues[0]} onClick={() => toggleEntryComplete(row.employee.id, !row.entry.isComplete)}>{row.entry.isComplete ? "已确认完成" : "确认该员工完成"}</button>
                  </div>
                </article>
              ))}
            </div>
            </>
          ) : null}

          {activeView === "employees" ? (
            <div className="table-shell">
              <div className="table-toolbar">
                <p>工资管理只显示在职员工。薪资组件通过调薪记录统一修改。</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setEmployeeModal({ mode: "create", draft: createEmployeeDraft() })}
                >
                  新增员工
                </button>
              </div>
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>基础工资</th>
                    <th>加班时薪</th>
                    <th>全勤奖金</th>
                    <th>工资管理操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStore.employees.filter((employee) => !employee.isResigned).map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.name}</td>
                      <td>{formatCurrency(employee.baseSalary)}</td>
                      <td>{employee.overtimeRate}</td>
                      <td>{formatCurrency(employee.attendanceBonus)}</td>
                      <td>
                        <button disabled={isLocked}
                          className="table-link"
                          type="button"
                          onClick={() =>
                            setEmployeeModal({
                              mode: "edit",
                              employeeId: employee.id,
                              draft: createEmployeeDraft(employee),
                            })
                          }
                        >
                          改姓名
                        </button>
                        <button disabled={isLocked}
                          className="table-link"
                          type="button"
                          onClick={() => openAdjustmentModal(employee.id)}
                        >
                          {employee.salaryConfigured ? "调薪" : "设置初始薪资"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {activeStore.employees.filter((employee) => !employee.isResigned).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-cell">
                        当前门店还没有在职员工。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeView === "adjustments" ? (
            <div className="table-shell">
              <div className="table-toolbar">
                <p>调薪记录会同步更新员工档案中的当前数值，用来替代原 Excel 的单独调薪表。</p>
                <button disabled={isLocked}
                  className="secondary-button"
                  type="button"
                  onClick={() => openAdjustmentModal(selectedRow?.employee.id)}
                >
                  新增调薪记录
                </button>
              </div>
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>姓名</th>
                    <th>调整内容</th>
                    <th>调整前</th>
                    <th>调整后</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStore.adjustments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        还没有调薪记录，新增后会在这里累积。
                      </td>
                    </tr>
                  ) : (
                    activeStore.adjustments.map((record) => (
                      <tr key={record.id}>
                        <td>{record.date}</td>
                        <td>{record.employeeName}</td>
                        <td>{record.itemLabel}</td>
                        <td>{record.previousValue}</td>
                        <td>{record.newValue}</td>
                        <td>{record.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <aside className="panel panel--detail">
          {selectedReviewRow ? (
            <>
              <SectionHeading
                eyebrow="当前员工"
                title={selectedReviewRow.employee.name}
                description={`${activeStore.name} · ${activeMonth} 工资计算明细`}
              />
              <div className={`review-card review-card--${selectedReviewRow.reviewStatus.tone}`}>
                <div className="review-card__result">
                  <span>{isLocked ? "已月结实发" : selectedReviewRow.entry.isComplete ? "已确认实发" : "预计实发"}</span>
                  <strong>{selectedReviewRow.employee.salaryConfigured ? formatCurrency(selectedReviewRow.breakdown.netSalary) : "待设置"}</strong>
                  <span className={`status-badge status-badge--${selectedReviewRow.reviewStatus.tone}`}>
                    {selectedReviewRow.reviewStatus.label}
                  </span>
                </div>
                <div className="review-card__copy">
                  <strong>当前员工月结状态</strong>
                  <p>{selectedReviewRow.reviewStatus.summary}</p>
                  <div className="issue-tags">
                    {(selectedReviewRow.changeItems.length > 0 ? selectedReviewRow.changeItems : ["本月暂无录入变化"]).map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="detail-card detail-card--confirmation">
                <h3>当前员工确认动作</h3>
                <p>{selectedReviewRow.entry.isComplete ? "当前已经确认完成；如果继续修改数据，系统会自动取消确认。" : selectedReviewRow.closeBlockers[0] ?? "点下确认后，这名员工才会从月结阻塞中移除。"}</p>
                <div className="detail-card__signal-list">
                  <span>{selectedReviewRow.closeBlockers[0] ?? "当前没有月结阻塞"}</span>
                  <span>{selectedReviewRow.hasDraftChanges ? "本月已有录入变更。" : "本月没有录入变更，也需要手动确认一次。"}</span>
                </div>
                <button
                  className={selectedReviewRow.entry.isComplete ? "completion-button completion-button--strong is-complete" : "completion-button completion-button--strong"}
                  type="button"
                  disabled={isLocked || (!selectedReviewRow.entry.isComplete && selectedReviewRow.validationIssues.length > 0) || !selectedReviewRow.employee.salaryConfigured}
                  title={selectedReviewRow.validationIssues[0]}
                  onClick={() => toggleEntryComplete(selectedReviewRow.employee.id, !selectedReviewRow.entry.isComplete)}
                >
                  {selectedReviewRow.entry.isComplete ? "已确认完成，点此取消" : "确认该员工本月录入完成"}
                </button>
                <div className="detail-card__meta">
                  <span>{selectedReviewRow.entry.isComplete ? `确认时间：${formatTimestamp(selectedReviewRow.entry.completedAt)}` : "确认后，这名员工才会计入本店可月结范围。"}</span>
                  <span>{selectedReviewRow.issueItems.length > 0 ? `待复核：${selectedReviewRow.issueItems.join("、")}` : "当前没有额外复核提示。"}</span>
                </div>
              </div>
              <div className="profile-strip">
                <div className="profile-strip__avatar" aria-hidden="true">{selectedReviewRow.employee.name.slice(-1)}</div>
                <div className="profile-strip__meta">
                  <strong>{selectedReviewRow.employee.name}</strong>
                  <span>当前工号：{selectedReviewRow.employee.id}</span>
                  <span>所属门店：{activeStore.name}</span>
                </div>
                <div className="profile-strip__status">
                  <span>{!selectedReviewRow.employee.salaryConfigured ? "薪资待设置" : selectedReviewRow.entry.auditPassed ? "稽核达标" : "待确认稽核"}</span>
                  <strong>{selectedReviewRow.employee.salaryConfigured ? formatCurrency(selectedReviewRow.breakdown.netSalary) : "待设置"}</strong>
                </div>
              </div>
              <div className="employee-summary">
                <div>
                  <span>当前底薪</span>
                  <strong>{formatCurrency(selectedReviewRow.employee.baseSalary)}</strong>
                </div>
                <div>
                  <span>加班时薪</span>
                  <strong>{selectedReviewRow.employee.overtimeRate} / 小时</strong>
                </div>
                <div>
                  <span>全勤奖金</span>
                  <strong>{formatCurrency(selectedReviewRow.employee.attendanceBonus)}</strong>
                </div>
              </div>

              <div className="formula-card">
                <h3>工资构成</h3>
                <div className="formula-list">
                  <div className="formula-list__group">
                    <span className="formula-list__title">扣减项</span>
                    <dl>
                      <div>
                        <dt>请假天数扣减</dt>
                        <dd>- {formatCurrency(selectedReviewRow.breakdown.leaveDaysDeduction)}</dd>
                      </div>
                      <div>
                        <dt>请假小时扣减</dt>
                        <dd>- {formatCurrency(selectedReviewRow.breakdown.leaveHoursDeduction)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="formula-list__group">
                    <span className="formula-list__title">增加项</span>
                    <dl>
                      <div>
                        <dt>加班工资</dt>
                        <dd>+ {formatCurrency(selectedReviewRow.breakdown.overtimePay)}</dd>
                      </div>
                      {activeStore.config.nightShiftRate > 0 ? (
                        <div>
                          <dt>夜班补贴</dt>
                          <dd>+ {formatCurrency(selectedReviewRow.breakdown.nightShiftPay)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>全勤奖金</dt>
                        <dd>+ {formatCurrency(selectedReviewRow.breakdown.attendancePay)}</dd>
                      </div>
                      <div>
                        <dt>稽核奖金</dt>
                        <dd>+ {formatCurrency(selectedReviewRow.breakdown.auditPay)}</dd>
                      </div>
                      <div>
                        <dt>社保补助</dt>
                        <dd>+ {formatCurrency(selectedReviewRow.breakdown.socialInsurance)}</dd>
                      </div>
                      <div>
                        <dt>饭补</dt>
                        <dd>+ {formatCurrency(selectedReviewRow.breakdown.mealAllowance)}</dd>
                      </div>
                      <div>
                        <dt>特殊加减项</dt>
                        <dd>{formatCurrency(selectedReviewRow.breakdown.specialAdjustment)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="result-band">
                  <span>{isLocked ? "已月结实发" : selectedReviewRow.entry.isComplete ? "已确认实发" : "预计实发"}</span>
                  <strong>{selectedReviewRow.employee.salaryConfigured ? formatCurrency(selectedReviewRow.breakdown.netSalary) : "待设置"}</strong>
                </div>

                {Array.isArray(selectedReviewRow.calculationTrace) && selectedReviewRow.calculationTrace.length > 0 ? (
                  <div className="formula-list formula-list--trace">
                    {TRACE_GROUPS.map((group) => {
                      const steps = selectedReviewRow.calculationTrace.filter((step) => step.group === group.id);
                      if (steps.length === 0) return null;
                      return (
                        <div className="formula-list__group" key={group.id}>
                          <span className="formula-list__title">{group.label}</span>
                          <dl>
                            {steps.map((step) => (
                              <div key={step.id}>
                                <dt>
                                  <strong>{step.label}</strong>
                                  <span>{step.formula}</span>
                                  <span>
                                    来源：
                                    {step.sourceFields.map((field) => TRACE_SOURCE_LABELS[field] ?? field).join("、")}
                                  </span>
                                  <span>
                                    输入：
                                    {Object.entries(step.inputs ?? {}).map(([key, value]) => `${key}=${formatTraceValue(value)}`).join("，")}
                                  </span>
                                  <span>{formatTraceRounding(step)}</span>
                                </dt>
                                <dd>{formatTraceAmount(step)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="timeline__empty">当前记录没有保存计算追踪；旧月结快照仍按冻结金额展示。</p>
                )}
              </div>

              <div className="detail-card">
                <h3>工资备注</h3>
                <textarea disabled={isLocked}
                  aria-label={`${selectedReviewRow.employee.name} 工资备注`}
                  value={selectedReviewRow.entry.note}
                  onChange={(event) => patchMonthlyEntry(selectedReviewRow.employee.id, { note: event.target.value })}
                  placeholder="例如：本月跨店支援、盘点补贴、临时奖励说明"
                />
              </div>

              <div className="detail-card detail-card--compact">
                <h3>门店规则</h3>
                <ul className="rule-list">
                  <li>稽核达标奖励：{formatCurrency(activeStore.config.auditPassedBonus)}</li>
                  <li>稽核未达标保底：{formatCurrency(activeStore.config.auditFallbackBonus)}</li>
                  <li>社保补助基数：{formatCurrency(activeStore.config.socialInsuranceBase)}</li>
                  <li>饭补基数：{formatCurrency(activeStore.config.mealAllowanceBase)}</li>
                  <li>
                    夜班补贴：
                    {activeStore.config.nightShiftRate > 0
                      ? `${formatCurrency(activeStore.config.nightShiftRate)} / 小时`
                      : "本店未启用"}
                  </li>
                </ul>
              </div>

              <div className="detail-card">
                <h3>最近调薪</h3>
                <div className="timeline">
                  {activeStore.adjustments.filter((record) => record.employeeId === selectedReviewRow.employee.id).length === 0 ? (
                    <p className="timeline__empty">当前员工还没有调薪记录。</p>
                  ) : (
                    activeStore.adjustments
                      .filter((record) => record.employeeId === selectedReviewRow.employee.id)
                      .slice(0, 3)
                      .map((record) => (
                        <article key={record.id} className="timeline__item">
                          <strong>{record.itemLabel}</strong>
                          <span>
                            {record.date} · {record.previousValue} → {record.newValue}
                          </span>
                          <p>{record.notes || "无备注"}</p>
                        </article>
                      ))
                  )}
                </div>
              </div>
              <div className="detail-card">
                <h3>本月月结记录</h3>
                <div className="timeline">
                  {monthlyStore.closeHistory.length === 0 ? <p className="timeline__empty">本月还没有月结或解锁记录。</p> : monthlyStore.closeHistory.slice().reverse().map((record) => <article className="timeline__item" key={record.id}><strong>{record.type === "closed" ? "完成月结" : "解锁工资"}</strong><span>{new Date(record.at).toLocaleString("zh-CN")}</span><p>{record.reason}</p></article>)}
                </div>
              </div>
            </>
          ) : (
            <div className="detail-empty">当前门店还没有员工，请先新增员工。</div>
          )}
        </aside>
      </section>
      <div className="mobile-save-bar" aria-label="移动端工资操作">
        <button className="secondary-button" type="button" onClick={exportCurrentMonth}>
          {isLocked ? "导出正式表" : "导出草稿"}
        </button>
        <button className="primary-button" type="button" onClick={isLocked ? onUnlockPayroll : onClosePayroll}>
          {isLocked ? "申请解锁" : "确认月结"}
        </button>
      </div>
    </>
  );
}
