export function RecoveryScreen({ recoveryState, onRestore, onExportCorrupt, onReset }) {
  return (
    <div className="lock-screen">
      <div className="lock-screen__card lock-screen__card--wide">
        <h1>工作区数据恢复</h1>
        <p>当前工作区数据无法读取，请从备份恢复或导出后进行重置。</p>
        <div className="recovery-actions">
          <button className="primary-button" type="button" onClick={onRestore}>从备份恢复</button>
          <button className="secondary-button" type="button" onClick={onExportCorrupt}>导出当前损坏数据</button>
          <button className="secondary-button" type="button" onClick={onReset}>重置为演示工作区</button>
        </div>
      </div>
    </div>
  );
}
