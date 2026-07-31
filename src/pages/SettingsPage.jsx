import { useEffect, useRef, useState } from "react";
import { Card, Form, InputNumber, Input, Button, Tag, Popconfirm, Upload, List, Space, Row, Col, Timeline, Typography, Alert } from "antd";
import {
  ShopOutlined,
  EditOutlined,
  StopOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  UnlockOutlined,
  ExportOutlined,
  ImportOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";

const { Text, Title, Paragraph } = Typography;

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
    setDrafts(Object.fromEntries(configFields.map(([key]) => [key, store.config[key]])));
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
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="门店设置"
        title="门店、算薪规则与数据安全"
        description="集中维护门店列表、本金计算参数、访问密码与离线数据备份。"
        actions={
          <Button type="primary" size="large" icon={<ShopOutlined />} onClick={onCreateStore}>
            新增门店
          </Button>
        }
      />

      <Card title="门店管理 (营业与停用)" style={{ borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          {stores.map((item) => (
            <Col xs={24} sm={12} md={8} key={item.id}>
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  borderColor: item.id === store.id ? "#1677ff" : undefined,
                  background: item.status === "archived" ? "#fafafa" : "#fff",
                }}
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    {item.id === store.id && <Tag color="blue">当前</Tag>}
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
                    改名
                  </Button>
                  {item.status === "active" ? (
                    <Popconfirm title="确定停用该门店？历史工资将保持只读可查。" onConfirm={() => onArchiveStore(item)}>
                      <Button size="small" danger icon={<StopOutlined />}>
                        停用
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

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title={`${store.name} 薪酬计算参数`} style={{ borderRadius: 8 }}>
            <Row gutter={[16, 16]}>
              {configFields.map(([key, label, hint, min]) => (
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
                      value={drafts[key] ?? store.config[key]}
                      onChange={(val) => setDrafts((current) => ({ ...current, [key]: val }))}
                      onBlur={() => commitConfig(key, drafts[key])}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>

          <Card title="规则变更历史记录" style={{ borderRadius: 8, marginTop: 24 }}>
            {ruleHistory.length === 0 ? (
              <Text type="secondary">当前门店还没有规则变更。</Text>
            ) : (
              <Timeline
                items={ruleHistory.slice(0, 8).map((record) => ({
                  color: "gray",
                  children: (
                    <div>
                      <Text strong>{record.label}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(record.at).toLocaleString("zh-CN")} · {record.previousValue} → {record.newValue}
                      </Text>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="计算公式与数据安全" style={{ borderRadius: 8 }}>
            <Alert
              type="info"
              message="统一算薪公式"
              description={
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <strong>实发工资</strong> = 基础工资 - 请假扣减 + 加班工资/夜班补贴 + 全勤/稽核奖励 + 固定社保/饭补 + 特殊调整
                </div>
              }
              style={{ marginBottom: 20 }}
            />

            {desktopApi && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>应用访问保护锁</Text>
                <Space wrap align="center">
                  <Tag color={lockPinSet ? "success" : "default"}>
                    {lockPinSet ? "PIN 已设置" : "PIN 未设置"}
                  </Tag>
                  {lockPinSet ? (
                    <>
                      <Button size="small" onClick={() => setPinModal({ mode: "set", pin: "", confirmPin: "", oldPin: "" })}>修改 PIN</Button>
                      <Button size="small" onClick={() => setPinModal({ mode: "clear", pin: "", confirmPin: "", oldPin: "" })}>清除 PIN</Button>
                      <Button size="small" icon={<LockOutlined />} onClick={handleManualLock}>立即锁定</Button>
                    </>
                  ) : (
                    <Button size="small" type="primary" icon={<LockOutlined />} onClick={() => setPinModal({ mode: "set-first", pin: "", confirmPin: "" })}>设置 PIN</Button>
                  )}
                </Space>
              </div>
            )}

            <Text strong style={{ display: "block", marginBottom: 8 }}>数据备份与恢复点</Text>
            <Space wrap style={{ marginBottom: 16 }}>
              <Button icon={<ExportOutlined />} onClick={() => onExportBackup()}>导出备份</Button>
              <Button icon={<LockOutlined />} onClick={() => setPassphraseModal({ mode: "export" })}>加密导出</Button>
              <Button icon={<ImportOutlined />} onClick={() => backupInputRef.current?.click()}>从文件恢复</Button>
              <Button
                type="primary"
                ghost
                icon={<CloudUploadOutlined />}
                disabled={!autoBackupAvailable || autoBackupBusy}
                onClick={onCreateAutoBackup}
              >
                {autoBackupBusy ? "备份中…" : "立即创建恢复点"}
              </Button>
            </Space>

            <input
              ref={backupInputRef}
              style={{ display: "none" }}
              type="file"
              accept="application/json,.json"
              onChange={async (event) => {
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
              }}
            />

            <List
              header={<Text type="secondary" style={{ fontSize: 12 }}>自动恢复点列表</Text>}
              bordered
              size="small"
              dataSource={autoBackups}
              locale={{ emptyText: "暂无自动恢复点。" }}
              renderItem={(backup) => (
                <List.Item
                  actions={[
                    <Button key="res" size="small" onClick={() => onRestoreAutoBackup(backup.id)}>
                      恢复
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={new Date(backup.createdAt).toLocaleString("zh-CN")}
                    description={backup.reasonLabel}
                  />
                </List.Item>
              )}
              style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}
            />

            <Button block type="dashed" danger onClick={onResetDemoWorkspace}>
              恢复泛化演示工作区
            </Button>
            <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 11, textAlign: "center" }}>
              当前版本：v{appVersion}
            </Text>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
