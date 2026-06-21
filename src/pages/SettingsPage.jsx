import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";

export function SettingsPage({
  store, stores, patchConfig, appVersion, onExportBackup, onImportBackup,
  onCreateStore, onEditStore, onArchiveStore, onRestoreStore,
  autoBackups, autoBackupAvailable, autoBackupBusy, onCreateAutoBackup, onRestoreAutoBackup,
  ruleHistory,
}) {
  const backupInputRef = useRef(null);
  const [drafts, setDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const configFields = [
    ["socialInsuranceBase", "社保补助基数", "固定计入，不按请假扣减", 0],
    ["mealAllowanceBase", "饭补基数", "每月满勤饭补", 0],
    ["auditPassedBonus", "稽核达标奖励", "稽核达标时计入", 0],
    ["auditFallbackBonus", "稽核未达标保底", "稽核未达标时计入", 0],
    ["nightShiftRate", "夜班每小时补贴", "设为 0 表示本店不启用", 0],
    ["leaveDaysDivisor", "请假天数除数", "基础工资除以此数后按天扣减", 0.5],
    ["leaveHoursDivisor", "请假小时除数", "基础工资除以此数后按小时扣减", 0.5],
  ];

  useEffect(() => {
    setDrafts(Object.fromEntries(configFields.map(([key]) => [key, `${store.config[key]}`])));
    setErrors({});
  }, [store.id]);

  function commitConfig(key) {
    const value = Number(drafts[key]);
    const error = patchConfig(key, value);
    if (error) {
      setErrors((current) => ({ ...current, [key]: error }));
      setDrafts((current) => ({ ...current, [key]: `${store.config[key]}` }));
      return;
    }
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  return (
    <>
      <PageHeader eyebrow="设置" title="系统与门店设置" description="管理门店、工资规则、本机恢复点与版本信息。" actions={<button className="primary-button" type="button" onClick={onCreateStore}>新增门店</button>} />
      <section className="panel page-panel">
        <SectionHeading eyebrow="门店管理" title="营业与历史门店" description="停用门店不会删除员工或历史工资，可随时恢复。" />
        <div className="store-management-grid">
          {stores.map((item) => (
            <article className={item.status === "archived" ? "store-management-card is-archived" : "store-management-card"} key={item.id}>
              <div><span className={`status-badge status-badge--${item.status === "active" ? "success" : "idle"}`}>{item.status === "active" ? "营业中" : "已停用"}</span><strong>{item.name}</strong>{item.id === store.id ? <small>当前选择</small> : null}</div>
              <div className="store-management-card__actions"><button className="secondary-button" type="button" onClick={() => onEditStore(item)}>改名</button>{item.status === "active" ? <button className="danger-button" type="button" onClick={() => onArchiveStore(item)}>停用</button> : <button className="primary-button" type="button" onClick={() => onRestoreStore(item.id)}>恢复营业</button>}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="settings-layout">
        <div className="panel page-panel">
          <SectionHeading eyebrow="工资规则" title={`${store.name}计算参数`} description="离开输入框时保存；已月结结果保持冻结。" />
          <div className="settings-grid">
            {configFields.map(([key, label, hint, min]) => (
              <label className="setting-field" key={key}>
                <span>{label}</span>
                <input type="number" step="0.5" min={min} value={drafts[key] ?? ""} aria-invalid={Boolean(errors[key])} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} onBlur={() => commitConfig(key)} />
                <small className={errors[key] ? "field-error" : ""}>{errors[key] || hint}</small>
              </label>
            ))}
          </div>
          <div className="history-panel">
            <SectionHeading eyebrow="规则记录" title="最近规则变更" description="保留当前门店参数修改记录。" />
            <div className="timeline">{ruleHistory.length === 0 ? <p className="timeline__empty">当前门店还没有规则变更。</p> : ruleHistory.slice(0, 8).map((record) => <article className="timeline__item" key={record.id}><strong>{record.label}</strong><span>{new Date(record.at).toLocaleString("zh-CN")} · {record.previousValue} → {record.newValue}</span></article>)}</div>
          </div>
        </div>
        <aside className="panel page-panel">
          <SectionHeading eyebrow="计算逻辑" title="当前公式" description="系统使用统一公式，并读取本店参数。" />
          <div className="formula-explainer"><strong>实发工资</strong><span>= 基础工资</span><span>- 请假天数 / 小时扣减</span><span>+ 加班工资 / 夜班补贴</span><span>+ 全勤 / 稽核奖励</span><span>+ 固定社保补助 / 饭补</span><span>+ 特殊加减项</span></div>
          <div className="backup-panel">
            <SectionHeading eyebrow="数据安全" title="备份与自动恢复点" description={autoBackupAvailable ? "桌面版会在每日首次启动、恢复前和月结后保留恢复点。" : "浏览器预览仅支持手动备份；桌面版启用自动恢复点。"} />
            <div className="backup-actions"><button className="secondary-button" type="button" onClick={onExportBackup}>导出数据备份</button><button className="secondary-button" type="button" onClick={() => backupInputRef.current?.click()}>从文件恢复</button></div>
            <button className="secondary-button backup-now-button" type="button" disabled={!autoBackupAvailable || autoBackupBusy} onClick={onCreateAutoBackup}>{autoBackupBusy ? "正在创建恢复点…" : "立即创建恢复点"}</button>
            <input ref={backupInputRef} className="backup-file-input" type="file" accept="application/json,.json" onChange={(event) => { onImportBackup(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="backup-list">
              {autoBackups.length === 0 ? <p className="timeline__empty">暂无自动恢复点。</p> : autoBackups.map((backup) => <article key={backup.id} className="backup-item"><div><strong>{new Date(backup.createdAt).toLocaleString("zh-CN")}</strong><span>{backup.reasonLabel}</span></div><button className="secondary-button" type="button" onClick={() => onRestoreAutoBackup(backup.id)}>恢复</button></article>)}
            </div>
            <p className="data-safety-warning"><strong>本机数据未加密</strong><span>请使用独立 Windows 账户、BitLocker，并把手动备份保存到受控的其他介质。</span></p>
            <p className="version-copy">当前版本：v{appVersion} · 当前采用手动确认安装更新</p>
          </div>
        </aside>
      </section>
    </>
  );
}
