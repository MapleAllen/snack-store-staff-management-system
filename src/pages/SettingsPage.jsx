import { useEffect, useRef, useState } from "react";
import { Card, Form, InputNumber, Input, Button, Tag, Popconfirm, Row, Col, Timeline, Typography, Alert, Tabs, Space, Modal } from "antd";
import {
  ShopOutlined,
  EditOutlined,
  StopOutlined,
  ReloadOutlined,
  LockOutlined,
  ExportOutlined,
  ImportOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { DisabledActionHint } from "../components/DisabledActionHint.jsx";
import { formatCurrency } from "../payrollLogic.js";

const { Text, Paragraph } = Typography;

const OPERATION_LABELS = {
  "store-created": "门店已创建",
  "store-renamed": "门店已改名",
  "store-archived": "门店已停用",
  "store-restored": "门店已恢复营业",
  "salary-adjusted": "薪资组件已调整",
  "employee-resigned": "员工已离职",
  "employee-restored": "员工已恢复在职",
  "rule-updated": "算薪规则已更新",
  "employee-transferred": "员工已调店",
  "employee-profile-updated": "员工资料已更新",
  "payroll-closed": "工资月结已封账",
  "payroll-unlocked": "工资月结已解锁",
  "payout-created": "发薪批次已创建",
  "payout-row-updated": "员工发薪交付状态已更新",
  "retail-day-closed": "营业日结已封账",
  "retail-day-reopened": "营业日结已解锁",
  "retail-sale-recorded": "销售单已记录",
  "retail-sale-refunded": "销售退款已记录",
  "cash-movement-recorded": "门店现金调入/调出已记录",
  "cash-transfer-recorded": "跨门店现金调拨已记录",
  "inventory-item-created": "商品目录已新增",
  "inventory-item-updated": "商品资料已更新",
  "inventory-item-archived": "商品目录已归档",
  "inventory-movement-recorded": "手工库存操作已记录",
  "inventory-stocktake-recorded": "全店盘点已保存",
  "inventory-transfer-recorded": "跨店库存调拨已记录",
  "supplier-created": "供应商已新增",
  "supplier-archived": "供应商已归档",
  "purchase-recorded": "采购入库已记录",
  "purchase-settled": "采购付款已确认",
  "purchase-returned": "供应商退货已记录",
  "operating-expense-recorded": "经营费用已记录",
  "operating-expense-voided": "经营费用已作废",
};

export function SettingsPage({
  store, stores, patchConfig, onExportBackup, onImportBackup,
  onCreateStore, onEditStore, onArchiveStore, onRestoreStore,
  autoBackups, autoBackupAvailable, autoBackupBusy, onCreateAutoBackup, onRestoreAutoBackup,
  onResetDemoWorkspace, onRequestLock, ruleHistory, operationLog = [],
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
  const desktopApi = window.payrollDesktop;

  useEffect(() => {
    if (!desktopApi) return;
    desktopApi.getLockStatus().then((status) => setLockPinSet(status.pinSet)).catch(() => {});
  }, []);

  // 含有通俗解释与实时影响预览的算薪规则定义
  const configFields = [
    {
      key: "socialInsuranceBase",
      label: "固定社保补助基数",
      hint: "固定发放给员工的社保补贴。不按请假扣减，不折入基础工资。",
      min: 0,
      getPreview: (val, empCount) => `${val} 元/人 · 本店 ${empCount} 人每月支出共 ${formatCurrency(val * empCount)}`,
    },
    {
      key: "mealAllowanceBase",
      label: "满勤饭补基数",
      hint: "每月全勤满勤时发放的餐食补贴。",
      min: 0,
      getPreview: (val, empCount) => `${val} 元/人 · 满勤发满，请假按比例扣除`,
    },
    {
      key: "auditPassedBonus",
      label: "全勤/稽核达标奖励",
      hint: "考勤标记为达标时奖励的金额。",
      min: 0,
      getPreview: (val) => `稽核达标按 +${val} 元/人计入算薪`,
    },
    {
      key: "auditFallbackBonus",
      label: "稽核未达标保底",
      hint: "考勤未达标时的保底奖励金额。",
      min: 0,
      getPreview: (val) => `未达标按 +${val} 元/人计入算薪`,
    },
    {
      key: "nightShiftRate",
      label: "夜班每小时补贴",
      hint: "夜班补贴单价。设为 0 元表示本店不启用夜班补贴。",
      min: 0,
      getPreview: (val) => val > 0 ? `按 ${val} 元/小时 × 实际夜班时长计算` : "未启用夜班补贴",
    },
    {
      key: "leaveDaysDivisor",
      label: "请假天数扣算除数",
      hint: "基础工资除以此天数算出日工资，按请假天数扣减。",
      min: 0.5,
      getPreview: (val) => `日扣除金额 = 基础工资 ÷ ${val} 天 × 请假天数`,
    },
    {
      key: "leaveHoursDivisor",
      label: "请假小时扣算除数",
      hint: "基础工资除以此小时数算出一小时工资，按请假小时扣减。",
      min: 0.5,
      getPreview: (val) => `时扣除金额 = 基础工资 ÷ ${val} 小时 × 请假小时`,
    },
  ];

  useEffect(() => {
    setDrafts(Object.fromEntries(configFields.map(({ key }) => [key, store.config[key]])));
    setErrors({});
  }, [store.id]);

  function commitConfig(key, rawValue) {
    const value = Number(rawValue);
    const error = patchConfig(key, value);
    if (error) {
      setErrors((current) => ({ ...current, [key]: error }));
      setDrafts((current) => ({ ...current, [key]: store.config[key] }));
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

  const latestBackup = autoBackups.find((backup) => !backup.isDamaged) ?? null;
  const employeeCount = (store.employees ?? []).length;

  const tabItems = [
    {
      key: "stores",
      label: <Space><ShopOutlined /> 门店架构管理</Space>,
      children: (
        <Card title="门店营业状态与列表" style={{ borderRadius: 8 }}>
          <Row gutter={[16, 16]}>
            {stores.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.id}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderColor: item.id === store.id ? "var(--brand)" : undefined,
                    background: item.status === "archived" ? "#fafafa" : "#fff",
                  }}
                  title={
                    <Space>
                      <Text strong>{item.name}</Text>
                      {item.id === store.id && <Tag color="blue">当前选中</Tag>}
                    </Space>
                  }
                  extra={
                    <Tag color={item.status === "active" ? "success" : "default"}>
                      {item.status === "active" ? "营业中" : "已停用"}
                    </Tag>
                  }
                >
                  <Space wrap style={{ marginTop: 8 }}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => onEditStore(item)}>
                      重命名
                    </Button>
                    {item.status === "active" ? (
                      <Popconfirm title="确定停用该门店？历史月份工资仍可查阅。" onConfirm={() => onArchiveStore(item)}>
                        <Button size="small" danger icon={<StopOutlined />}>
                          停用门店
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button size="small" type="primary" ghost icon={<ReloadOutlined />} onClick={() => onRestoreStore(item.id)}>
                        恢复营业
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      ),
    },
    {
      key: "rules",
      label: <Space><SettingOutlined /> 算薪规则参数</Space>,
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            <Card title={`${store.name} 算薪计算参数设置`} style={{ borderRadius: 8 }}>
              <Row gutter={[16, 16]}>
                {configFields.map(({ key, label, hint, min, getPreview }) => {
                  const currentValue = drafts[key] ?? store.config[key];
                  return (
                    <Col xs={24} sm={12} key={key}>
                      <Form.Item
                        label={label}
                        help={errors[key] || hint}
                        validateStatus={errors[key] ? "error" : ""}
                        style={{ marginBottom: 12 }}
                      >
                        <InputNumber
                          min={min}
                          step={0.5}
                          style={{ width: "100%" }}
                          value={currentValue}
                          onChange={(val) => setDrafts((current) => ({ ...current, [key]: val }))}
                          onBlur={() => commitConfig(key, drafts[key])}
                        />
                      </Form.Item>
                      <div style={{ background: "#faf6f1", padding: "6px 10px", borderRadius: 4, fontSize: 12, color: "var(--brand)", marginBottom: 16 }}>
                        <BulbOutlined style={{ marginRight: 6 }} />影响预览: {getPreview(currentValue, employeeCount)}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={9}>
            <Card title="算薪规则修改历史记录" style={{ borderRadius: 8 }}>
              {ruleHistory.length === 0 ? (
                <Text type="secondary">本门店暂无规则修改记录。</Text>
              ) : (
                <Timeline
                  items={ruleHistory.slice(0, 10).map((record) => ({
                    color: "blue",
                    children: (
                      <div>
                        <Text strong>{record.label}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(record.at).toLocaleString("zh-CN")}
                        </Text>
                        <div style={{ fontSize: 13, marginTop: 2 }}>
                          <span style={{ color: "#8c8c8c" }}>旧值 {record.previousValue}</span> → <Text strong style={{ color: "var(--brand)" }}>新值 {record.newValue}</Text>
                        </div>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: "security",
      label: <Space><SafetyCertificateOutlined /> 数据安全与备份恢复</Space>,
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card title="本地操作审计" style={{ borderRadius: 8 }}>
            {operationLog.length === 0 ? <Text type="secondary">尚未记录关键操作。</Text> : <Timeline items={operationLog.slice(0, 20).map((event) => ({
              color: event.type === "payroll-unlocked" ? "orange" : "blue",
              children: <div><Text strong>{OPERATION_LABELS[event.type] ?? "关键操作"}</Text>{event.employeeName && <Text type="secondary"> · {event.employeeName}</Text>}{event.month && <Text type="secondary"> · {event.month}</Text>}{event.businessDate && <Text type="secondary"> · {event.businessDate}</Text>}<br /><Text type="secondary" style={{ fontSize: 12 }}>{event.at ? new Date(event.at).toLocaleString("zh-CN") : "历史记录"}</Text></div>,
            }))} />}
          </Card>
          {/* 应用访问保护锁 */}
          {desktopApi && (
            <Card title="应用访问保护锁" style={{ borderRadius: 8 }}>
              <Row gutter={[24, 24]} align="middle">
                <Col xs={24} md={12}>
                  <Text style={{ fontSize: 13, color: "#595959", display: "block", marginBottom: 8 }}>
                    为应用设置 PIN 后，打开或锁定时需要输入 PIN 才能进入。
                  </Text>
                  <Tag color={lockPinSet ? "success" : "default"} style={{ marginRight: 8 }}>
                    {lockPinSet ? "PIN 已设置" : "PIN 未设置"}
                  </Tag>
                  <Space wrap>
                    {lockPinSet ? (
                      <>
                        <Button size="small" onClick={() => setPinModal({ mode: "set", pin: "", confirmPin: "", oldPin: "" })}>修改 PIN</Button>
                        <Button size="small" onClick={() => setPinModal({ mode: "clear", pin: "", confirmPin: "", oldPin: "" })}>清除 PIN</Button>
                        <Button size="small" icon={<LockOutlined />} onClick={handleManualLock}>立即锁定</Button>
                      </>
                    ) : (
                      <Button size="small" type="primary" icon={<LockOutlined />} onClick={() => setPinModal({ mode: "set-first", pin: "", confirmPin: "" })}>
                        设置 PIN
                      </Button>
                    )}
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Alert
                    type="info"
                    showIcon
                    message="无加密纯本地存储"
                    description="全部门店、员工和薪资数据均保存在本地设备中。建议每月结账封账后导出数据备份以防设备故障。"
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* 主备份卡片 */}
          <Card title="本地数据安全与恢复点" style={{ borderRadius: 8 }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f", borderRadius: 8 }}>
                  <Text strong style={{ fontSize: 15, display: "block", color: "#389e0d" }}>
                    自动恢复点机制
                  </Text>
                  <Text style={{ fontSize: 13, color: "#595959", marginTop: 4, display: "block" }}>
                    上次自动备份：{latestBackup ? new Date(latestBackup.createdAt).toLocaleString("zh-CN") : "今天已就绪"}
                  </Text>
                  <DisabledActionHint disabled={!autoBackupAvailable || autoBackupBusy} reason={autoBackupBusy ? "正在创建恢复点，请稍候。" : "本地恢复点仅在桌面版可用；当前可使用下方 JSON 备份。"}>
                    <Button
                      type="primary"
                      style={{ backgroundColor: "#52c41a", borderColor: "#52c41a", marginTop: 12 }}
                      icon={<CloudUploadOutlined />}
                      disabled={!autoBackupAvailable || autoBackupBusy}
                      onClick={onCreateAutoBackup}
                    >
                      {autoBackupBusy ? "创建中…" : "立即创建本地恢复点"}
                    </Button>
                  </DisabledActionHint>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card size="small" style={{ borderRadius: 8 }}>
                  <Text strong style={{ fontSize: 15, display: "block" }}>
                    手动文件备份与导入
                  </Text>
                  <Space wrap style={{ marginTop: 12 }}>
                    <Button icon={<ExportOutlined />} onClick={() => onExportBackup()}>导出备份 JSON</Button>
                    <Button icon={<LockOutlined />} onClick={() => setPassphraseModal({ mode: "export" })}>加密导出</Button>
                    <Button icon={<ImportOutlined />} onClick={() => backupInputRef.current?.click()}>从文件恢复数据</Button>
                  </Space>
                </Card>
              </Col>
            </Row>

            <input
              ref={backupInputRef}
              style={{ display: "none" }}
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                file.text().then((raw) => {
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed.protected) {
                      setPassphraseModal({ mode: "import", file });
                    } else {
                      onImportBackup(file);
                    }
                  } catch {
                    onImportBackup(file);
                  }
                });
              }}
            />
          </Card>

          {/* 自动恢复点列表 */}
          <Card title="自动恢复点列表" style={{ borderRadius: 8 }}>
            {autoBackups.length === 0 ? (
              <Text type="secondary">暂无自动恢复点。</Text>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {autoBackups.slice(0, 8).map((backup) => (
                  <div
                    key={backup.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      background: "#f8fafc",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <Space size={6}><Text strong>{new Date(backup.createdAt).toLocaleString("zh-CN")}</Text>{backup.isDamaged && <Tag color="error">已损坏</Tag>}</Space>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{backup.isDamaged ? backup.error : backup.reasonLabel}</Text>
                    </div>
                    {backup.isDamaged ? <Button size="small" disabled>不可恢复</Button> : <Popconfirm
                      title="恢复该恢复点？"
                      description="当前工作区数据将被该恢复点覆盖，建议先导出当前备份。"
                      onConfirm={() => onRestoreAutoBackup(backup.id)}
                      okText="确认恢复"
                      cancelText="取消"
                    >
                      <Button size="small">恢复</Button>
                    </Popconfirm>}
                  </div>
                ))}
              </Space>
            )}
          </Card>

          {/* 危险区域隔离 */}
          <Card
            title={<Space><WarningOutlined style={{ color: "#ff4d4f" }} /><Text type="danger" strong>危险区 - 重置演示工作区</Text></Space>}
            style={{ borderRadius: 8, borderColor: "#ffccc7" }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              此功能将清空当前本地所有实际门店与员工数据，并将系统恢复为泛化演示店铺与示例员工。此操作不可逆，请务必先导出当前备份。
            </Paragraph>
            <Popconfirm
              title="确定恢复为默认演示工作区？"
              description="当前本地工作区数据将被覆盖，确认继续吗？"
              onConfirm={onResetDemoWorkspace}
              okText="确认重置"
              okButtonProps={{ danger: true }}
              cancelText="取消"
            >
              <Button danger icon={<ExclamationCircleOutlined />}>
                恢复泛化演示工作区
              </Button>
            </Popconfirm>
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="门店管理"
        title="门店、算薪规则与数据安全"
        description="维护门店营业状态、通俗化算薪参数、访问锁与本地离线备份。"
        actions={
          <Button type="primary" size="large" icon={<ShopOutlined />} onClick={onCreateStore}>
            新增门店
          </Button>
        }
      />

      <Tabs items={tabItems} size="large" type="card" style={{ width: "100%" }} />

      {/* PIN 设置 / 修改 / 清除弹窗 */}
      {pinModal && (
        <Modal
          title={
            pinModal.mode === "set" ? "修改应用 PIN"
              : pinModal.mode === "clear" ? "清除应用 PIN"
                : "设置应用 PIN"
          }
          open={Boolean(pinModal)}
          onCancel={() => setPinModal(null)}
          footer={null}
          width={420}
        >
          <form className="modal-form" onSubmit={handlePinSubmit}>
            {pinModal.mode === "set" && (
              <label className="field">
                <span>旧 PIN</span>
                <Input.Password
                  autoFocus
                  maxLength={6}
                  value={pinModal.oldPin ?? ""}
                  onChange={(e) => setPinModal((c) => ({ ...c, oldPin: e.target.value.replace(/\D/g, "") }))}
                  placeholder="输入当前 PIN"
                />
              </label>
            )}
            <label className="field">
              <span>{pinModal.mode === "clear" ? "输入当前 PIN 确认清除" : "新 PIN (4-6 位数字)"}</span>
              <Input.Password
                autoFocus={pinModal.mode !== "set"}
                maxLength={6}
                value={pinModal.pin ?? ""}
                onChange={(e) => setPinModal((c) => ({ ...c, pin: e.target.value.replace(/\D/g, "") }))}
                placeholder="输入 4-6 位数字"
              />
            </label>
            {pinModal.mode !== "clear" && (
              <label className="field">
                <span>再次输入确认</span>
                <Input.Password
                  maxLength={6}
                  value={pinModal.confirmPin ?? ""}
                  onChange={(e) => setPinModal((c) => ({ ...c, confirmPin: e.target.value.replace(/\D/g, "") }))}
                  placeholder="再次输入 PIN"
                />
              </label>
            )}
            {pinError && <Alert type="error" showIcon message={pinError} />}
            <div className="modal-actions">
              <Button onClick={() => setPinModal(null)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={pinBusy}>
                确认
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 加密备份导出 / 加密备份导入口令弹窗 */}
      {passphraseModal && (
        <Modal
          title={passphraseModal.mode === "import" ? "此备份已加密" : "加密导出备份"}
          open={Boolean(passphraseModal)}
          onCancel={() => setPassphraseModal(null)}
          footer={null}
          width={420}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (passphraseModal.mode === "import") {
                onImportBackup(passphraseModal.file, importPassphrase);
              } else {
                onExportBackup(importPassphrase);
              }
              setPassphraseModal(null);
              setImportPassphrase("");
            }}
          >
            <p className="modal-copy">
              {passphraseModal.mode === "import"
                ? "该备份文件使用口令加密，请输入导出时设置的口令以解密恢复。"
                : "设置口令后，导出的备份文件将加密保存，恢复时需要输入该口令。"}
            </p>
            <label className="field">
              <span>备份口令</span>
              <Input.Password
                autoFocus
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                placeholder="输入口令"
              />
            </label>
            <div className="modal-actions">
              <Button onClick={() => { setPassphraseModal(null); setImportPassphrase(""); }}>取消</Button>
              <Button type="primary" htmlType="submit" disabled={!importPassphrase}>
                确认
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Space>
  );
}
