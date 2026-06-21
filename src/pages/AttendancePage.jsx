import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";

const ATTENDANCE_FIELD_LABELS = {
  overtimeHours: "加班时长",
  leaveDays: "请假天数",
  leaveHours: "请假小时",
  nightShiftHours: "夜班时长",
};

export function AttendancePage({ store, activeMonth, rows, patchEntry, toggleComplete, isLocked, onNavigate }) {
  const totalOvertime = rows.reduce((sum, row) => sum + row.breakdown.overtimeHours, 0);
  const totalLeaveDays = rows.reduce((sum, row) => sum + row.breakdown.leaveDays, 0);
  const qualified = rows.filter((row) => row.entry.auditPassed).length;

  return (
    <>
      <PageHeader
        eyebrow="Attendance"
        title={`${store.name}考勤管理`}
        description={`${activeMonth} 的考勤数据会直接参与工资计算。${isLocked ? " 本月已月结，当前为只读状态。" : ""}`}
        actions={
          <button className="primary-button" type="button" onClick={() => onNavigate("payroll")}>
            去核对工资
          </button>
        }
      />
      <section className="stats-grid">
        <StatCard label="累计加班" value={`${totalOvertime} 小时`} hint="按员工加班时薪计入工资" accent="primary" />
        <StatCard label="累计请假" value={`${totalLeaveDays} 天`} hint="另含按小时请假扣减" />
        <StatCard label="稽核达标" value={`${qualified} 人`} hint={`共 ${rows.length} 位员工`} accent="success" />
        <StatCard label="夜班规则" value={store.config.nightShiftRate ? `${store.config.nightShiftRate} 元/时` : "未启用"} hint="按门店规则计算" />
      </section>
      <section className="panel page-panel">
        <SectionHeading eyebrow="Monthly Attendance" title="本月考勤录入" description="这里的修改与工资管理页面实时同步；工资页仍需逐个点确认完成。" />
        <div className="table-shell">
          <table className="payroll-table">
            <thead>
              <tr>
                <th>姓名</th><th>加班时长</th><th>请假天数</th><th>请假小时</th>
                {store.config.nightShiftRate > 0 ? <th>夜班时长</th> : null}
                <th>稽核状态</th><th>备注</th><th>录入确认</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employee.id}>
                  <td><strong>{row.employee.name}</strong></td>
                  {["overtimeHours", "leaveDays", "leaveHours"].map((field) => (
                    <td key={field}>
                      <input disabled={isLocked}
                        className="cell-input"
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`${row.employee.name} ${ATTENDANCE_FIELD_LABELS[field]}`}
                        value={row.entry[field]}
                        onChange={(event) => patchEntry(row.employee.id, { [field]: event.target.value })}
                      />
                    </td>
                  ))}
                  {store.config.nightShiftRate > 0 ? (
                    <td>
                      <input disabled={isLocked}
                        className="cell-input"
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label={`${row.employee.name} ${ATTENDANCE_FIELD_LABELS.nightShiftHours}`}
                        value={row.entry.nightShiftHours}
                        onChange={(event) => patchEntry(row.employee.id, { nightShiftHours: event.target.value })}
                      />
                    </td>
                  ) : null}
                  <td>
                    <button
                      className={row.entry.auditPassed ? "pill-toggle is-active" : "pill-toggle"}
                      disabled={isLocked}
                      type="button"
                      aria-label={`${row.employee.name} 稽核状态`}
                      aria-pressed={row.entry.auditPassed}
                      onClick={() => patchEntry(row.employee.id, { auditPassed: !row.entry.auditPassed })}
                    >
                      {row.entry.auditPassed ? "达标" : "未达标"}
                    </button>
                  </td>
                  <td>
                    <input disabled={isLocked}
                      className="note-input"
                      aria-label={`${row.employee.name} 考勤备注`}
                      value={row.entry.note}
                      onChange={(event) => patchEntry(row.employee.id, { note: event.target.value })}
                      placeholder="考勤备注"
                    />
                  </td>
                  <td>
                    <button className={row.entry.isComplete ? "completion-button completion-button--strong is-complete" : "completion-button completion-button--strong"} type="button" disabled={isLocked || (!row.entry.isComplete && row.validationIssues.length > 0)} title={row.validationIssues[0]} onClick={() => toggleComplete(row.employee.id, !row.entry.isComplete)}>{row.entry.isComplete ? "已确认完成" : row.validationIssues.length ? "先修正再确认" : "确认该员工完成"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
