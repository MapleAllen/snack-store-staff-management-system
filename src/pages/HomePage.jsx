import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import {
  formatCurrency,
  getMonthlyStoreRecord,
  getPayrollCloseBlockers,
  getPayrollIssueItems,
  getPayrollStageSummary,
  getStorePayrollRows,
} from "../payrollLogic.js";

export function HomePage({ workspace, activeMonth, onNavigate, onSelectStore }) {
  const activeStores = workspace.stores.filter((store) => store.status === "active");
  const storeSummaries = activeStores.map((store) => {
    const rows = getStorePayrollRows(workspace, activeMonth, store);
    const monthlyStore = getMonthlyStoreRecord(workspace, activeMonth, store.id);
    const stage = getPayrollStageSummary(rows, monthlyStore);
    const issueRows = rows.filter((row) => row.employee.salaryConfigured && getPayrollIssueItems(row).length > 0);
    const blockerRows = rows.filter((row) => getPayrollCloseBlockers(row).length > 0);
    return {
      store,
      rows,
      stage,
      issueRows,
      blockerRows,
      exceptions: issueRows.length,
      blockers: blockerRows.length,
    };
  });
  const totalForecast = storeSummaries.reduce((sum, item) => sum + item.stage.forecastTotal, 0);
  const totalConfirmed = storeSummaries.reduce((sum, item) => sum + item.stage.confirmedTotal, 0);
  const totalClosed = storeSummaries.reduce((sum, item) => sum + item.stage.closedTotal, 0);
  const totalEmployees = storeSummaries.reduce((sum, item) => sum + item.stage.employeeCount, 0);
  const totalUnconfigured = storeSummaries.reduce((sum, item) => sum + item.stage.unconfiguredCount, 0);
  const totalPending = storeSummaries.reduce((sum, item) => sum + item.stage.pendingCount, 0);
  const totalInvalid = storeSummaries.reduce((sum, item) => sum + item.stage.invalidCount, 0);
  const totalExceptions = storeSummaries.reduce((sum, item) => sum + item.exceptions, 0);
  const totalBlockers = totalUnconfigured + totalPending + totalInvalid;
  const readyStores = storeSummaries.filter((item) => !item.stage.isClosed && item.stage.employeeCount > 0 && item.blockers === 0);
  const closedStores = storeSummaries.filter((item) => item.stage.isClosed).length;

  const nextUnconfigured = storeSummaries.find((item) => item.stage.unconfiguredCount > 0);
  const nextInvalid = storeSummaries.find((item) => item.stage.invalidCount > 0);
  const nextPending = storeSummaries.find((item) => item.stage.pendingCount > 0);
  const nextIssue = storeSummaries.find((item) => item.exceptions > 0);
  const nextReady = readyStores[0];
  const recommendedAction = totalUnconfigured
    ? { label: "先补薪资设置", hint: `${totalUnconfigured} 位员工还不能进入确认`, storeId: nextUnconfigured?.store.id }
    : totalInvalid
      ? { label: "先修正输入错误", hint: `${totalInvalid} 条数据需要先修正`, storeId: nextInvalid?.store.id }
      : totalPending
        ? { label: "逐个确认员工", hint: `还有 ${totalPending} 位员工还没点确认完成`, storeId: nextPending?.store.id }
        : totalExceptions
          ? { label: "复核重点变化", hint: `${totalExceptions} 位员工含请假、调整或未达标`, storeId: nextIssue?.store.id }
          : readyStores.length
            ? { label: "去做门店月结", hint: `${readyStores.length} 家门店已经可以直接月结`, storeId: nextReady?.store.id }
            : { label: "查看已完成工资", hint: `${closedStores} 家门店已经月结`, storeId: storeSummaries[0]?.store.id };
  const priorityRows = storeSummaries
    .flatMap((item) => item.blockerRows.map((row) => ({
      storeId: item.store.id,
      storeName: item.store.name,
      employeeId: row.employee.id,
      employeeName: row.employee.name,
      reason: getPayrollCloseBlockers(row)[0],
    })))
    .slice(0, 5);

  function goToPayroll(storeId) {
    if (storeId) onSelectStore(storeId);
    onNavigate("payroll");
  }

  return (
    <>
      <PageHeader
        eyebrow="本月总览"
        title="老板本月工资待办"
        description={`${activeMonth} 先处理未设置、待录入和异常，再确认月结。`}
        actions={<button className="primary-button" type="button" onClick={() => goToPayroll(recommendedAction.storeId)}>{recommendedAction.label}</button>}
      />
      <section className="owner-priority-board">
        <div className="owner-priority-board__main">
          <span className="hero__eyebrow">当前最先处理</span>
          <h2>{recommendedAction.label}</h2>
          <p>{recommendedAction.hint}</p>
          <div className="owner-priority-board__actions">
            <button className="primary-button" type="button" onClick={() => goToPayroll(recommendedAction.storeId)}>{recommendedAction.label}</button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("reports")}>查看门店报表</button>
          </div>
        </div>
        <div className="owner-priority-board__side">
          <div className="priority-checklist">
            <strong>今天卡住月结的员工</strong>
            {priorityRows.length > 0 ? (
              <div className="priority-checklist__items">
                {priorityRows.map((item) => (
                  <button key={`${item.storeId}-${item.employeeId}`} className="priority-checklist__item" type="button" onClick={() => goToPayroll(item.storeId)}>
                    <span>{item.storeName}</span>
                    <strong>{item.employeeName}</strong>
                    <small>{item.reason}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p>当前没有阻塞员工；可以直接去做月结或查看已完成工资。</p>
            )}
          </div>
          <div className="priority-ready">
            <span>可直接月结</span>
            <strong>{readyStores.length} 家门店</strong>
            <small>{readyStores.length > 0 ? readyStores.map((item) => item.store.name).slice(0, 2).join("、") : "先把所有员工逐个确认完成"}</small>
          </div>
        </div>
      </section>
      <section className="stats-grid">
        <StatCard label="已确认实发" value={formatCurrency(totalConfirmed)} hint={`预计实发 ${formatCurrency(totalForecast)}`} accent="primary" />
        <StatCard label="已月结实发" value={formatCurrency(totalClosed)} hint={`${closedStores}/${activeStores.length} 家门店完成`} accent={closedStores === activeStores.length ? "success" : undefined} />
        <StatCard label="月结阻塞" value={`${totalBlockers} 项`} hint={`待确认 ${totalPending} · 待设置 ${totalUnconfigured} · 输入有误 ${totalInvalid}`} accent={totalBlockers ? "warning" : "success"} />
        <StatCard label="待复核变化" value={`${totalExceptions} 人`} hint={`${totalEmployees} 位在岗员工`} accent={totalExceptions ? "warning" : "success"} />
      </section>
      <section className="dashboard-grid">
        <div className="panel page-panel">
          <SectionHeading eyebrow="门店待办" title={`${activeStores.length} 家门店处理状态`} description="点击门店直接进入工资工作台。" />
          <div className="store-cards">
            {storeSummaries.map((item) => {
              const maxTotal = Math.max(...storeSummaries.map((summary) => summary.stage.forecastTotal), 1);
              const status = item.stage.isClosed
                ? { label: "已月结", tone: "success" }
                : item.stage.unconfiguredCount
                  ? { label: "待设置薪资", tone: "warning" }
                  : item.stage.invalidCount
                    ? { label: "有输入错误", tone: "danger" }
                    : item.stage.pendingCount
                      ? { label: "待员工确认", tone: "idle" }
                      : item.exceptions
                        ? { label: "已确认待复核", tone: "warning" }
                        : { label: "可直接月结", tone: "success" };
              return (
                <button className="store-card" key={item.store.id} type="button" onClick={() => goToPayroll(item.store.id)}>
                  <div className="store-card__head"><strong>{item.store.name}</strong><span className={`status-badge status-badge--${status.tone}`}>{status.label}</span></div>
                  <strong className="store-card__value">{formatCurrency(item.stage.isClosed ? item.stage.closedTotal : item.stage.confirmedTotal)}</strong>
                  <span className="store-card__forecast">预计 {formatCurrency(item.stage.forecastTotal)}</span>
                  <div className="progress-track"><span style={{ width: `${Math.max(10, (item.stage.forecastTotal / maxTotal) * 100)}%` }} /></div>
                  <div className="store-card__meta">
                    <span>已确认 {item.stage.confirmedCount}</span>
                    <span>阻塞 {item.blockers}</span>
                    <span>复核 {item.exceptions}</span>
                  </div>
                  {item.blockerRows.length > 0 ? (
                    <div className="store-card__alerts">
                      {item.blockerRows.slice(0, 2).map((row) => <span key={row.employee.id}>{row.employee.name}：{getPayrollCloseBlockers(row)[0]}</span>)}
                    </div>
                  ) : item.issueRows.length > 0 ? (
                    <div className="store-card__alerts">
                      {item.issueRows.slice(0, 2).map((row) => <span key={row.employee.id}>{row.employee.name}：{getPayrollIssueItems(row)[0]}</span>)}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="panel page-panel">
          <SectionHeading eyebrow="核薪顺序" title="老板确认顺序" description="状态按风险和下一步排序。" />
          <ol className="workflow-list">
            <li><strong>先补薪资设置</strong><span>新员工没有三项薪资时，不能进入确认。</span></li>
            <li><strong>逐个确认员工</strong><span>即使本月没变化，也要点确认完成。</span></li>
            <li><strong>复核重点变化</strong><span>重点看请假、调整和未达标员工。</span></li>
            <li><strong>月结并导出</strong><span>全部确认后再冻结并导出正式工资表。</span></li>
          </ol>
        </aside>
      </section>
    </>
  );
}
