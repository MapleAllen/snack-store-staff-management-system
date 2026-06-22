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
    })));
  const priorityEmployees = priorityRows.slice(0, 3);
  const blockerReasonSummary = Object.entries(priorityRows.reduce((summary, item) => {
    summary[item.reason] = (summary[item.reason] ?? 0) + 1;
    return summary;
  }, {}))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  function goToPayroll(storeId) {
    if (storeId) onSelectStore(storeId);
    onNavigate("payroll");
  }

  return (
    <>
      <section className="command-center">
        <div className="command-center__main">
          <span className="hero__eyebrow">本月指挥台</span>
          <h1>{recommendedAction.label}</h1>
          <p>{activeMonth} {recommendedAction.hint}。先清掉阻塞，再决定是否月结和导出。</p>
          <div className="command-center__actions">
            <button className="primary-button" type="button" onClick={() => goToPayroll(recommendedAction.storeId)}>{recommendedAction.label}</button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("reports")}>查看门店报表</button>
          </div>
          <div className="command-center__digest">
            <article className="command-center__metric">
              <span>当前月结阻塞</span>
              <strong>{totalBlockers > 0 ? `${totalBlockers} 项` : "没有阻塞"}</strong>
              <small>{totalBlockers > 0 ? "待确认、待设薪资和输入错误会阻止月结" : "当前可以进入复核或直接月结"}</small>
            </article>
            <article className="command-center__metric">
              <span>老板本轮最先动作</span>
              <strong>{recommendedAction.label}</strong>
              <small>{recommendedAction.hint}</small>
            </article>
          </div>
        </div>
        <div className="command-center__side">
          <div className="confidence-card">
            <div className="confidence-card__header">
              <strong>结薪信心摘要</strong>
              <span>{activeMonth}</span>
            </div>
            <div className="confidence-card__grid">
              <article className={totalPending > 0 ? "confidence-card__item is-warning" : "confidence-card__item is-success"}>
                <span>待确认员工</span>
                <strong>{totalPending} 人</strong>
                <small>{totalPending > 0 ? "逐个确认后才能进入月结" : "当前没有待确认员工"}</small>
              </article>
              <article className={readyStores.length > 0 ? "confidence-card__item is-success" : "confidence-card__item"}>
                <span>可直接月结</span>
                <strong>{readyStores.length} 家</strong>
                <small>{readyStores.length > 0 ? readyStores.map((item) => item.store.name).slice(0, 2).join("、") : "先把员工确认完整"}</small>
              </article>
              <article className={totalExceptions > 0 ? "confidence-card__item is-warning" : "confidence-card__item"}>
                <span>待复核变化</span>
                <strong>{totalExceptions} 人</strong>
                <small>{totalExceptions > 0 ? "请假、调整或未达标仍建议抽查" : "当前没有重点变化"}</small>
              </article>
            </div>
          </div>
          <div className="blocker-digest">
            <strong>当前阻塞摘要</strong>
            {blockerReasonSummary.length > 0 ? (
              <div className="blocker-digest__reasons">
                {blockerReasonSummary.map(([reason, count]) => (
                  <span key={reason} className="blocker-digest__reason">{reason} · {count} 人</span>
                ))}
              </div>
            ) : (
              <p>当前没有月结阻塞，可以直接进入复核或月结。</p>
            )}
            {priorityEmployees.length > 0 ? (
              <div className="priority-checklist__items">
                {priorityEmployees.map((item) => (
                  <button key={`${item.storeId}-${item.employeeId}`} className="priority-checklist__item" type="button" onClick={() => goToPayroll(item.storeId)}>
                    <span>{item.storeName}</span>
                    <strong>{item.employeeName}</strong>
                    <small>{item.reason}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="预计实发" value={formatCurrency(totalForecast)} hint={`${totalEmployees} 位在岗员工`} accent="primary" />
        <StatCard label="已确认实发" value={formatCurrency(totalConfirmed)} hint={`${totalPending} 人待确认`} />
        <StatCard label="已月结实发" value={formatCurrency(totalClosed)} hint={`${closedStores}/${activeStores.length} 家门店完成`} accent={closedStores === activeStores.length ? "success" : "default"} />
        <StatCard label="月结阻塞" value={`${totalBlockers} 项`} hint={`待确认 ${totalPending} · 待设置 ${totalUnconfigured} · 输入有误 ${totalInvalid}`} accent={totalBlockers ? "warning" : "success"} />
      </section>

      <section className="dashboard-grid">
        <div className="panel page-panel">
          <SectionHeading eyebrow="门店待办" title={`${activeStores.length} 家门店处理状态`} description="先看阶段，再决定是否进入工资工作台。" />
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
              const alertRows = item.blockerRows.length > 0 ? item.blockerRows.slice(0, 1) : item.issueRows.slice(0, 2);
              return (
                <button className="store-card" key={item.store.id} type="button" onClick={() => goToPayroll(item.store.id)}>
                  <div className="store-card__stage">
                    <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>
                    <span>{item.blockers > 0 ? `阻塞 ${item.blockers}` : item.exceptions > 0 ? `复核 ${item.exceptions}` : "状态稳定"}</span>
                  </div>
                  <strong className="store-card__title">{item.store.name}</strong>
                  <strong className="store-card__value">{formatCurrency(item.stage.isClosed ? item.stage.closedTotal : item.stage.confirmedTotal)}</strong>
                  <span className="store-card__forecast">预计 {formatCurrency(item.stage.forecastTotal)}</span>
                  <div className="progress-track"><span style={{ width: `${Math.max(10, (item.stage.forecastTotal / maxTotal) * 100)}%` }} /></div>
                  <div className="store-card__meta">
                    <span>已确认 {item.stage.confirmedCount}</span>
                    <span>待确认 {item.stage.pendingCount}</span>
                    <span>待复核 {item.exceptions}</span>
                  </div>
                  {alertRows.length > 0 ? (
                    <div className="store-card__alerts">
                      {alertRows.map((row) => (
                        <span key={row.employee.id}>
                          {row.employee.name}：{item.blockerRows.length > 0 ? getPayrollCloseBlockers(row)[0] : getPayrollIssueItems(row)[0]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="panel page-panel">
          <SectionHeading eyebrow="核薪顺序" title="老板确认顺序" description="用同一套顺序处理所有门店。" />
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
