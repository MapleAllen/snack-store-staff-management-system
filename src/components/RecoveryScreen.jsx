import { Button } from "antd";

export function RecoveryScreen({ recoveryState, onRestore, onExportCorrupt, onReset }) {
  return (
    <div className="lock-screen">
      <div className="lock-screen__card lock-screen__card--wide">
        <h1>工作区数据恢复</h1>
        <p>当前工作区数据无法读取，请从备份恢复或导出后进行重置。</p>
        <div className="recovery-actions">
          <Button type="primary" size="large" onClick={onRestore}>从备份恢复</Button>
          <Button onClick={onExportCorrupt}>导出当前损坏数据</Button>
          <Button onClick={onReset}>重置为演示工作区</Button>
        </div>
      </div>
    </div>
  );
}
