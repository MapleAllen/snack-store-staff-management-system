import { PageHeader } from "../components/PageHeader.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import { formatCurrency, getAssignmentAtMonth, getEmployeeAssignments, getEmployeesWithStoreHistory } from "../payrollLogic.js";

export function EmployeesPage({ workspace, store, currentMonth, onCreate, onEdit, onToggleResignation, onTransfer }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const employees = getEmployeesWithStoreHistory(workspace, store.id);
  const storeMap = new Map(workspace.stores.map((item) => [item.id, item]));
  const cards = employees.map((employee) => {
    const assignments = getEmployeeAssignments(workspace, employee.id);
    const currentAssignment = getAssignmentAtMonth(workspace, employee.id, currentMonth);
    const futureAssignment = assignments.find((assignment) => assignment.startMonth > currentMonth);
    const storeHistory = assignments.filter((assignment) => assignment.storeId === store.id);
    const currentHere = currentAssignment?.storeId === store.id;
    const plannedOut = currentHere && futureAssignment?.storeId !== store.id ? futureAssignment : null;
    const plannedIn = !currentHere && futureAssignment?.storeId === store.id ? futureAssignment : null;
    return { employee, currentAssignment, storeHistory, currentHere, plannedOut, plannedIn };
  }).sort((a, b) => Number(b.currentHere) - Number(a.currentHere));
  const visibleCards = cards.filter(({ employee, currentHere }) => {
    if (!employee.name.includes(searchTerm.trim())) return false;
    if (statusFilter === "active") return currentHere && !employee.isResigned;
    if (statusFilter === "pending") return currentHere && !employee.isResigned && !employee.salaryConfigured;
    if (statusFilter === "history") return employee.isResigned || !currentHere;
    return true;
  });

  return (
    <>
      <PageHeader eyebrow="员工" title={`${store.name}员工管理`} description="维护员工档案、在职状态和按月生效的跨店调动。" actions={<button className="primary-button" type="button" onClick={onCreate}>新增员工</button>} />
      <section className="dashboard-grid dashboard-grid--employees">
        <div className="panel page-panel">
          <SectionHeading eyebrow="员工档案" title="员工档案" description={`本店当前及历史共 ${cards.length} 位员工。`} action={<div className="employee-filters"><input aria-label="搜索员工姓名" placeholder="搜索姓名" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /><select aria-label="员工状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">全部员工</option><option value="active">当前在岗</option><option value="pending">薪资待设置</option><option value="history">历史员工</option></select></div>} />
          <div className="employee-card-grid">
            {visibleCards.map(({ employee, currentAssignment, storeHistory, currentHere, plannedOut, plannedIn }) => (
              <article className={`employee-card ${employee.isResigned || !currentHere ? "employee-card--resigned" : ""}`} key={employee.id}>
                <div className="employee-card__header-row">
                  <div className="employee-card__identity"><div className="employee-card__avatar">{employee.name.slice(-1)}</div><div className="employee-card__body"><strong>{employee.name}</strong><span>工号 {employee.id}</span></div></div>
                  {employee.isResigned ? <span className="badge badge--resigned">已离职 ({employee.resignationDate})</span> : !employee.salaryConfigured ? <span className="status-badge status-badge--warning">薪资待设置</span> : currentHere ? <span className="status-badge status-badge--success">当前在本店</span> : <span className="status-badge status-badge--idle">历史员工</span>}
                </div>
                <dl><div><dt>基础工资</dt><dd>{formatCurrency(employee.baseSalary)}</dd></div><div><dt>加班时薪</dt><dd>{employee.overtimeRate} / 小时</dd></div><div><dt>全勤奖金</dt><dd>{formatCurrency(employee.attendanceBonus)}</dd></div></dl>
                {plannedOut ? <p className="assignment-notice">将于 {plannedOut.startMonth} 调往 {storeMap.get(plannedOut.storeId)?.name}</p> : null}
                {plannedIn ? <p className="assignment-notice">将于 {plannedIn.startMonth} 调入本店</p> : null}
                {!currentHere && currentAssignment ? <p className="assignment-notice">当前归属：{storeMap.get(currentAssignment.storeId)?.name}</p> : null}
                <div className="employee-card__actions"><button className="secondary-button" type="button" onClick={() => onEdit(employee)}>编辑姓名</button>{currentHere && !employee.isResigned ? <button className="secondary-button" type="button" onClick={() => onTransfer(employee)}>员工调店</button> : null}{currentHere ? <button className="ghost-button" type="button" onClick={() => onToggleResignation(employee, !employee.isResigned)}>{employee.isResigned ? "恢复在职" : "办理离职"}</button> : null}</div>
                <details className="assignment-history"><summary>查看门店归属历史</summary>{storeHistory.map((assignment) => <span key={assignment.id}>{assignment.startMonth} 至 {assignment.endMonth ?? "现在"} · {assignment.note || "门店任职"}</span>)}</details>
              </article>
            ))}
            {visibleCards.length === 0 ? <p className="empty-state">当前筛选下没有员工。</p> : null}
          </div>
        </div>
        <aside className="panel page-panel">
          <SectionHeading eyebrow="Salary Changes" title="最近调薪" description="最新记录优先展示。" />
          <div className="timeline">{workspace.adjustments.filter((record) => record.storeId === store.id).length === 0 ? <p className="timeline__empty">当前门店还没有调薪记录。</p> : workspace.adjustments.filter((record) => record.storeId === store.id).slice(0, 8).map((record) => <article key={record.id} className="timeline__item"><strong>{record.employeeName} · {record.itemLabel}</strong><span>{record.date} · {record.previousValue} → {record.newValue}</span><p>{record.notes || "无备注"}</p></article>)}</div>
        </aside>
      </section>
    </>
  );
}
import { useState } from "react";
