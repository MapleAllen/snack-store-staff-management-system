import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";

export function SettingsPage({
  store, stores, patchConfig, appVersion, onExportBackup, onImportBackup,
  onCreateStore, onEditStore, onArchiveStore, onRestoreStore,
  autoBackups, autoBackupAvailable, autoBackupBusy, onCreateAutoBackup, onRestoreAutoBackup,
  onResetDemoWorkspace, onRequestLock, ruleHistory,
}) {
  const backupInputRef = useRef(null);
  const [drafts, setDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const [pinModal, setPinModal] = useState(null);
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [lockPinSet, setLockPinSet] = useState(false);
  const [passphraseModal, setPassphraseModal] = useState(null);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [importPassphraseFile, setImportPassphraseFile] = useState(null);
  const desktopApi = window.payrollDesktop;

  useEffect(() => {
    if (!desktopApi) return;
    desktopApi.getLockStatus().then((status) => setLockPinSet(status.pinSet)).catch(() => {});
  }, []);

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

  async function handlePinSubmit(event) {
    event.preventDefault();
    if (pinBusy) return;
    const mode = pinModal?.mode;
    const pin = pinModal?.pin ?? "";
    const confirmPin = pinModal?.confirmPin ?? "";
    if (!/^\d{4,6}$/.test(pin)) { setPinError("PIN 必须为 4-6 位数字"); return; }
    if ((mode === "set" || mode === "set-first") && pin !== confirmPin) { setPinError("两次输入的 PIN 不一致"); return; }
    setPinBusy(true);
    setPinError("");
    try {
      if (mode === "set") {
        await desktopApi.setPin(pin, pinModal.oldPin);
      } else if (mode === "set-first") {
        await desktopApi.setPin(pin);
      } else if (mode === "clear") {
        await desktopApi.clearPin(pin);
      }
      const status = await desktopApi.getLockStatus();
      setLockPinSet(status.pinSet);
      setPinModal(null);
      if (mode === "clear" && onRequestLock) onRequestLock();
    } catch (err) {
      const messages = {
        "lock:pin-format-invalid": "PIN 必须为 4-6 位数字",
        "lock:pin-old-mismatch": "旧 PIN 不正确",
        "lock:pin-invalid": "PIN 不正确",
      };
      setPinError(messages[err?.code] ?? "操作失败，请重试");
    } finally {
      setPinBusy(false);
    }
  }

  async function handleManualLock() {
    if (!desktopApi) return;
    try {
      await desktopApi.lock();
      if (onRequestLock) onRequestLock();
    } catch {}
  }

  return (
    <>
      <PageHeader eyebrow="设置" title="系统与门店设置" description="管理门店、工资规则与本机恢复方案。" actions={<button className="primary-button" type="button" onClick={onCreateStore}>新增门店</button>} />
      <section className="panel page-panel">
        <SectionHeading eyebrow="门店管理" title="营业与历史门店" description="停用门店不会删除员工或历史工资。" />
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
          <SectionHeading eyebrow="工资规则" title={`${store.name}计算参数`} description="离开输入框时保存；已月结结果继续冻结。" />
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
          {desktopApi ? (
            <div className="backup-panel">
              <SectionHeading eyebrow="数据安全" title="应用访问锁" description="设置 4-6 位 PIN 后，每次启动需输入 PIN 才能进入工作区。" />
              <div className="pin-status">
                <span className={`status-badge status-badge--${lockPinSet ? "success" : "idle"}`}>{lockPinSet ? "PIN 已设置" : "PIN 未设置"}</span>
                <div className="backup-actions">
                  {lockPinSet ? (
                    <>
                      <button className="secondary-button" type="button" onClick={() => setPinModal({ mode: "set", pin: "", confirmPin: "", oldPin: "" })}>修改 PIN</button>
                      <button className="secondary-button" type="button" onClick={() => setPinModal({ mode: "clear", pin: "", confirmPin: "", oldPin: "" })}>清除 PIN</button>
                      <button className="secondary-button" type="button" onClick={handleManualLock}>立即锁定</button>
                    </>
                  ) : (
                    <button className="primary-button" type="button" onClick={() => setPinModal({ mode: "set-first", pin: "", confirmPin: "" })}>设置 PIN</button>
                  )}
                </div>
                {pinModal ? (
                  <div className="pin-modal-inline">
                    <form className="modal-form" onSubmit={handlePinSubmit}>
                      {(pinModal.mode === "set" || pinModal.mode === "clear") ? (
                        <label className="field"><span>{pinModal.mode === "set" ? "当前 PIN" : "输入 PIN 确认清除"}</span><input autoFocus type="password" inputMode="numeric" maxLength={6} value={pinModal.oldPin ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setPinModal((c) => ({ ...c, oldPin: v.length <= 6 ? v : c.oldPin })); }} /></label>
                      ) : null}
                      <label className="field"><span>{pinModal.mode === "clear" ? "请再次输入 PIN" : "新 PIN（4-6 位数字）"}</span><input type="password" inputMode="numeric" maxLength={6} value={pinModal.pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setPinModal((c) => ({ ...c, pin: v.length <= 6 ? v : c.pin })); }} autoFocus={pinModal.mode !== "set" && pinModal.mode !== "clear"} /></label>
                      {(pinModal.mode === "set" || pinModal.mode === "set-first") ? (
                        <label className="field"><span>确认新 PIN</span><input type="password" inputMode="numeric" maxLength={6} value={pinModal.confirmPin} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setPinModal((c) => ({ ...c, confirmPin: v.length <= 6 ? v : c.confirmPin })); }} /></label>
                      ) : null}
                      {pinError ? <p className="field-error">{pinError}</p> : null}
                      <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setPinModal(null); setPinError(""); }}>取消</button><button className="primary-button" type="submit" disabled={pinBusy}>{pinBusy ? "处理中…" : "确认"}</button></div>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="backup-panel">
            <SectionHeading eyebrow="数据安全" title="备份与自动恢复点" description={autoBackupAvailable ? "桌面版会在每日首次启动、恢复前和月结后保留恢复点。" : "浏览器预览仅支持手动备份；桌面版才有自动恢复点。"} />
            <div className="backup-actions">
              <button className="secondary-button" type="button" onClick={() => onExportBackup()}>导出数据备份</button>
              <button className="secondary-button" type="button" onClick={() => setPassphraseModal({ mode: "export" })}>导出加密备份</button>
              <button className="secondary-button" type="button" onClick={() => backupInputRef.current?.click()}>从文件恢复</button>
            </div>
            <button className="secondary-button backup-now-button" type="button" disabled={!autoBackupAvailable || autoBackupBusy} onClick={onCreateAutoBackup}>{autoBackupBusy ? "正在创建恢复点…" : "立即创建恢复点"}</button>
            <input ref={backupInputRef} className="backup-file-input" type="file" accept="application/json,.json" onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const raw = await file.text();
                const parsed = JSON.parse(raw);
                if (parsed.protected) {
                  setImportPassphraseFile(file);
                  setImportPassphrase("");
                } else {
                  onImportBackup(file);
                }
              } catch {
                onImportBackup(file);
              }
            }} />
            <div className="backup-list">
              {autoBackups.length === 0 ? <p className="timeline__empty">暂无自动恢复点。</p> : autoBackups.map((backup) => <article key={backup.id} className="backup-item"><div><strong>{new Date(backup.createdAt).toLocaleString("zh-CN")}</strong><span>{backup.reasonLabel}</span></div><button className="secondary-button" type="button" onClick={() => onRestoreAutoBackup(backup.id)}>恢复</button></article>)}
            </div>
            {importPassphraseFile ? (
              <div className="pin-modal-inline">
                <form className="modal-form" onSubmit={(e) => { e.preventDefault(); onImportBackup(importPassphraseFile, importPassphrase); setImportPassphraseFile(null); }}>
                  <p>此备份已加密，请输入口令：</p>
                  <label className="field"><span>备份口令</span><input autoFocus type="password" value={importPassphrase} onChange={(e) => setImportPassphrase(e.target.value)} /></label>
                  <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setImportPassphraseFile(null)}>取消</button><button className="primary-button" type="submit" disabled={!importPassphrase}>确认</button></div>
                </form>
              </div>
            ) : null}
            {passphraseModal?.mode === "export" ? (
              <div className="pin-modal-inline">
                <form className="modal-form" onSubmit={(e) => {
                  e.preventDefault();
                  const pw = passphraseModal.passphrase ?? "";
                  if (pw.length < 8) return;
                  if (pw !== passphraseModal.confirm) return;
                  onExportBackup(pw);
                  setPassphraseModal(null);
                }}>
                  <p>设置备份口令（至少 8 位）：</p>
                  <label className="field"><span>口令</span><input autoFocus type="password" value={passphraseModal.passphrase ?? ""} onChange={(e) => setPassphraseModal((c) => ({ ...c, passphrase: e.target.value }))} /></label>
                  <label className="field"><span>确认口令</span><input type="password" value={passphraseModal.confirm ?? ""} onChange={(e) => setPassphraseModal((c) => ({ ...c, confirm: e.target.value }))} /></label>
                  <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setPassphraseModal(null)}>取消</button><button className="primary-button" type="submit" disabled={(passphraseModal.passphrase?.length ?? 0) < 8 || passphraseModal.passphrase !== passphraseModal.confirm}>导出加密备份</button></div>
                </form>
              </div>
            ) : null}
            <p className="data-safety-warning"><strong>本机数据未加密</strong><span>请使用独立 Windows 账户、BitLocker，并把手动备份保存到受控的其他介质。</span></p>
            <div className="demo-reset-panel">
              <strong>恢复泛化演示工作区</strong>
              <p>仅在需要对外演示或清理旧示例内容时使用。不会在启动时自动覆盖现有本地工作区。</p>
              <button className="secondary-button" type="button" onClick={onResetDemoWorkspace}>恢复泛化演示工作区</button>
            </div>
            <p className="version-copy">当前版本：v{appVersion} · 当前采用手动确认安装更新</p>
          </div>
        </aside>
      </section>
    </>
  );
}
