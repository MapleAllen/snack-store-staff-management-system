import { useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import {
  formatCurrency,
  getMonthlyStoreRecord,
  getPayrollCloseBlockers,
  getPayrollIssueMessage,
  getPayrollIssueItems,
  getPayrollStageSummary,
  getStorePayrollRows,
} from "../payrollLogic.js";

export function ReportsPage({ workspace, activeMonth, setActiveMonth, onSelectStore, onNavigate }) {
  const [includeArchived, setIncludeArchived] = useState(false);
  const stores = workspace.stores.filter((store) => includeArchived || store.status === "active");
  const summaries = stores.map((store) => {
    const rows = getStorePayrollRows(workspace, activeMonth, store);
    const monthlyStore = getMonthlyStoreRecord(workspace, activeMonth, store.id);
    const stage = getPayrollStageSummary(rows, monthlyStore);
    const blockerRows = rows.filter((row) => getPayrollCloseBlockers(row).length > 0);
    const reviewRows = rows.filter((row) => row.employee.salaryConfigured && getPayrollIssueItems(row).length > 0);
    const overtime = rows.reduce((sum, row) => sum + row.breakdown.overtimePay, 0);
    const deductions = rows.reduce((sum, row) => sum + row.breakdown.leaveDaysDeduction + row.breakdown.leaveHoursDeduction, 0);
    const adjustments = rows.reduce((sum, row) => sum + Math.abs(row.breakdown.specialAdjustment), 0);
    return { store, rows, stage, blockerRows, reviewRows, overtime, deductions, adjustments };
  });
  const forecastTotal = summaries.reduce((sum, item) => sum + item.stage.forecastTotal, 0);
  const confirmedTotal = summaries.reduce((sum, item) => sum + item.stage.confirmedTotal, 0);
  const closedTotal = summaries.reduce((sum, item) => sum + item.stage.closedTotal, 0);
  const readyStores = summaries.filter((item) => !item.stage.isClosed && item.rows.length > 0 && item.blockerRows.length === 0);
  const pending = summaries.reduce((sum, item) => sum + item.blockerRows.length, 0);
  const reviewCount = summaries.reduce((sum, item) => sum + item.reviewRows.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="报表"
        title="门店工资报表中心"
        description={`${activeMonth} 区分预计、已确认与已月结金额，并直接说明哪家门店还不能发。`}
        actions={<div className="report-controls"><label className="field field--compact"><span>报表月份</span><input type="month" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)} /></label><label className="inline-check"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /><span>包含停用门店</span></label></div>}
      />
      <section className="stats-grid">
        <StatCard label="已确认实发" value={formatCurrency(confirmedTotal)} hint={`预计 ${formatCurrency(forecastTotal)}`} accent="primary" />
        <StatCard label="可直接月结门店" value={`${readyStores.length} 家`} hint={`${summaries.filter((item) => item.stage.isClosed).length} 家已冻结`} accent={readyStores.length ? "success" : undefined} />
        <StatCard label="月结阻塞员工" value={`${pending} 人`} hint="未设置薪资、输入有误或还没逐个确认" accent={pending ? "warning" : "success"} />
        <StatCard label="待复核变化" value={`${reviewCount} 人`} hint={`已月结实发 ${formatCurrency(closedTotal)}`} accent={reviewCount ? "warning" : "success"} />
      </section>
      <section className="panel page-panel">
        <SectionHeading eyebrow="门店明细" title="门店完成度与工资状态" description="营业门店可进入工作台；停用门店只读展示历史。" />
        <div className="report-bars">
          {summaries.map((item) => {
            const status = item.stage.isClosed
              ? { label: "已月结", tone: "success" }
              : item.stage.unconfiguredCount
                ? { label: "待设置薪资", tone: "warning" }
                : item.stage.invalidCount
                  ? { label: "有输入错误", tone: "danger" }
                  : item.stage.pendingCount
                    ? { label: "待员工确认", tone: "idle" }
                    : item.reviewRows.length > 0
                      ? { label: "已确认待复核", tone: "warning" }
                      : { label: "可直接月结", tone: "success" };
            const topReview = item.reviewRows[0] ? `${item.reviewRows[0].employee.name}：${getPayrollIssueItems(item.reviewRows[0])[0]}` : "当前没有重点变化";
            const topBlocker = item.blockerRows[0] ? `${item.blockerRows[0].employee.name}：${getPayrollIssueMessage(getPayrollCloseBlockers(item.blockerRows[0])[0])}` : "本店当前没有月结阻塞";
            return (
              <button key={item.store.id} className="report-row report-row--detailed" type="button" disabled={item.store.status === "archived"} onClick={() => { onSelectStore(item.store.id); onNavigate("payroll"); }}>
                <div className="report-row__label">
                  <strong>{item.store.name}</strong>
                  <span>{item.rows.length} 人 · 已确认 {item.stage.confirmedCount}/{item.stage.employeeCount}</span>
                </div>
                <div className="report-row__bar"><span style={{ width: `${forecastTotal ? (item.stage.forecastTotal / forecastTotal) * 100 : 0}%` }} /></div>
                <div className="report-row__amount">
                  <strong>{formatCurrency(item.stage.isClosed ? item.stage.closedTotal : item.stage.confirmedTotal)}</strong>
                  <span>预计 {formatCurrency(item.stage.forecastTotal)}</span>
                </div>
                <div className="report-row__health">
                  <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>
                  <strong>{item.blockerRows.length > 0 ? `${item.blockerRows.length} 人阻塞` : item.reviewRows.length > 0 ? `${item.reviewRows.length} 人待复核` : "可以直接进入月结"}</strong>
                  <small>{item.blockerRows.length > 0 ? topBlocker : topReview}</small>
                </div>
                <div className="report-row__drivers">
                  <span>加班 {formatCurrency(item.overtime)}</span>
                  <span>请假扣减 {formatCurrency(item.deductions)}</span>
                  <span>特殊调整 {formatCurrency(item.adjustments)}</span>
                </div>
              </button>
            );
          })}
          {summaries.length === 0 ? <p className="empty-state">当前筛选下没有门店数据。</p> : null}
        </div>
      </section>
    </>
  );
}
