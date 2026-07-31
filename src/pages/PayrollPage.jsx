import { useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Alert,
  Tooltip,
  Modal,
  Descriptions,
  Typography,
  Divider,
} from "antd";
import {
  CheckCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  ExportOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";

import { StatCard } from "../components/StatCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import {
  formatCurrency,
  getPayrollIssueMessage,
} from "../payrollLogic.js";

const { Text } = Typography;

const PAYROLL_ADJUSTMENT_CATEGORIES = [
  { value: "bonus", label: "奖金" },
  { value: "deduction", label: "扣款" },
  { value: "reimbursement", label: "报销" },
  { value: "correction", label: "修正" },
];

const DEFAULT_PAYROLL_ADJUSTMENT_DRAFT = {
  category: "bonus",
  amount: "",
  reason: "",
  status: "pending",
};

function makePayrollAdjustmentId() {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `payroll-adjustment-${value}`;
}

function getPayrollAdjustments(entry) {
  return Array.isArray(entry?.payrollAdjustments) ? entry.payrollAdjustments : [];
}

export function PayrollPage({
  activeStore,
  activeMonth,
  setActiveMonth,
  exportCurrentMonth,
  totalNetSalary,
  forecastNetSalary,
  payrollRows,
  touchedRows,
  exceptionCount,
  completionRate,
  monthlyStore,
  selectedRow,
  setSelectedEmployeeId,
  patchMonthlyEntry,
  toggleEntryComplete,
  setEmployeeModal,
  openAdjustmentModal,
  isLocked,
  onClosePayroll,
  onUnlockPayroll,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState("all");
  const [formulaModalRow, setFormulaModalRow] = useState(null);

  const [adjustmentFormVisible, setAdjustmentFormVisible] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState(DEFAULT_PAYROLL_ADJUSTMENT_DRAFT);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState(null);

  const isClosed = monthlyStore?.status === "closed";
  const blockerRows = payrollRows.filter((row) => row.closeBlockers.length > 0);
  const reviewRows = payrollRows.filter((row) => row.employee.salaryConfigured && row.issueItems.length > 0);
  const pendingCount = payrollRows.filter((row) => !row.entry.isComplete).length;
  const canClose = blockerRows.length === 0;

  const visiblePayrollRows = payrollRows.filter((row) => {
    if (searchTerm && !row.employee.name.includes(searchTerm.trim()) && !row.employee.id.includes(searchTerm.trim())) {
      return false;
    }
    if (viewFilter === "pending") return !row.entry.isComplete;
    if (viewFilter === "issues") return row.closeBlockers.length > 0 || row.issueItems.length > 0;
    if (viewFilter === "resigned") return row.employee.isResigned;
    return true;
  });

  const selectedAdjustments = getPayrollAdjustments(selectedRow?.entry);

  function resetAdjustmentForm() {
    setAdjustmentDraft(DEFAULT_PAYROLL_ADJUSTMENT_DRAFT);
    setEditingAdjustmentId(null);
    setAdjustmentFormVisible(false);
  }

  function handleSaveAdjustment(event) {
    event?.preventDefault();
    if (!selectedRow) return;
    const amountNum = Number(adjustmentDraft.amount);
    if (!amountNum || amountNum <= 0) return;

    const currentList = getPayrollAdjustments(selectedRow.entry);
    let nextList = [];
    if (editingAdjustmentId) {
      nextList = currentList.map((item) =>
        item.id === editingAdjustmentId
          ? {
              ...item,
              category: adjustmentDraft.category,
              amount: amountNum,
              reason: adjustmentDraft.reason,
              status: adjustmentDraft.status,
            }
          : item
      );
    } else {
      nextList = [
        ...currentList,
        {
          id: makePayrollAdjustmentId(),
          category: adjustmentDraft.category,
          amount: amountNum,
          reason: adjustmentDraft.reason,
          status: adjustmentDraft.status,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    patchMonthlyEntry(selectedRow.employee.id, { payrollAdjustments: nextList });
    resetAdjustmentForm();
  }

  function handleDeleteAdjustment(id) {
    if (!selectedRow) return;
    const nextList = getPayrollAdjustments(selectedRow.entry).filter((item) => item.id !== id);
    patchMonthlyEntry(selectedRow.employee.id, { payrollAdjustments: nextList });
  }

  const columns = [
    {
      title: "员工姓名与状态",
      dataIndex: ["employee", "name"],
      key: "name",
      width: 160,
      render: (text, record) => {
        const status = record.reviewStatus;
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 14 }}>{text}</Text>
            <Tag color={status.tone === "success" ? "success" : status.tone === "warning" ? "warning" : "error"}>
              {status.label}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "考勤与调薪概要",
      key: "summary",
      render: (_, record) => {
        const b = record.breakdown;
        return (
          <Space wrap size="small" style={{ fontSize: 12 }}>
            {b.overtimeHours > 0 && <Tag color="blue">加班 {b.overtimeHours}h</Tag>}
            {b.leaveDays > 0 && <Tag color="orange">请假 {b.leaveDays}天</Tag>}
            {b.leaveHours > 0 && <Tag color="orange">请假 {b.leaveHours}h</Tag>}
            {b.specialAdjustment !== 0 && (
              <Tag color={b.specialAdjustment > 0 ? "green" : "red"}>
                调整 {b.specialAdjustment > 0 ? "+" : ""}{formatCurrency(b.specialAdjustment)}
              </Tag>
            )}
            {!b.overtimeHours && !b.leaveDays && !b.leaveHours && !b.specialAdjustment && (
              <Text type="secondary">考勤正常</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "实发金额 (点击查算数)",
      key: "netSalary",
      width: 170,
      render: (_, record) => {
        if (!record.employee.salaryConfigured) {
          return (
            <Button size="small" type="link" danger onClick={(e) => { e.stopPropagation(); openAdjustmentModal(record.employee); }}>
              待设置薪资
            </Button>
          );
        }
        return (
          <Button
            type="text"
            icon={<CalculatorOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setFormulaModalRow(record);
            }}
            style={{ padding: "4px 8px" }}
          >
            <span className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: "#1677ff" }}>
              {formatCurrency(record.breakdown.netSalary)}
            </span>
          </Button>
        );
      },
    },
    {
      title: "完成确认",
      key: "isComplete",
      width: 150,
      align: "right",
      render: (_, record) => {
        const disabled = isClosed || (!record.entry.isComplete && record.closeBlockers.length > 0);
        const blockerMsg = record.closeBlockers.length ? getPayrollIssueMessage(record.closeBlockers[0]) : "";

        const btn = record.entry.isComplete ? (
          <Button
            type="primary"
            size="small"
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            disabled={isClosed}
            icon={<CheckCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              toggleEntryComplete(record.employee.id, false);
            }}
          >
            已确认
          </Button>
        ) : (
          <Button
            type="default"
            size="small"
            danger={record.closeBlockers.length > 0}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleEntryComplete(record.employee.id, true);
            }}
          >
            {record.closeBlockers.length ? "有阻塞项" : "点此确认"}
          </Button>
        );

        return record.closeBlockers.length && !record.entry.isComplete ? (
          <Tooltip title={blockerMsg}>{btn}</Tooltip>
        ) : (
          btn
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* 核心操作 Header - 突出月结封账大按钮 */}
      <PageHeader
        eyebrow="工资管理"
        title={`${activeStore?.name ?? "门店"} 工资核对中心`}
        description={`${activeMonth} 区分草稿与已封账状态，每位员工需完成明确确认后再执行全店月结。`}
        actions={
          <Space wrap align="center">
            <Input
              type="month"
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              style={{ width: 140 }}
            />
            <Button icon={<ExportOutlined />} onClick={exportCurrentMonth}>
              导出 CSV
            </Button>
            {isClosed ? (
              <Button
                type="primary"
                danger
                size="large"
                icon={<UnlockOutlined />}
                onClick={onUnlockPayroll}
              >
                解锁本月工资
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                style={{ backgroundColor: "#52c41a", borderColor: "#52c41a", height: 40, fontWeight: 600 }}
                icon={<LockOutlined />}
                onClick={onClosePayroll}
              >
                确认本月月结封账
              </Button>
            )}
          </Space>
        }
      />

      {/* 已月结封账冻结横幅 */}
      {isClosed && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          message={`本月工资已于 ${monthlyStore.closedAt ? new Date(monthlyStore.closedAt).toLocaleString("zh-CN") : "以前"} 结账封账`}
          description="当前工资表已冻结为不可修改状态。如需更正考勤或工资，请点击右上角“解锁本月工资”并填写解锁原因。"
        />
      )}

      {/* 3 张精简指标卡 (代原 5 卡挤压) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard
            label="本月预计实发总额"
            value={formatCurrency(forecastNetSalary)}
            hint={`已确认实发 ${formatCurrency(totalNetSalary)}`}
            accent="primary"
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="待确认完成员工"
            value={`${pendingCount} 人`}
            hint={`全店共 ${payrollRows.length} 位员工，确认进度 ${completionRate}%`}
            accent={pendingCount > 0 ? "warning" : "success"}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="月结阻塞项"
            value={`${blockerRows.length} 项`}
            hint={`包含复核提醒 ${reviewRows.length} 人`}
            accent={blockerRows.length > 0 ? "warning" : "success"}
          />
        </Col>
      </Row>

      {/* 主界面：左侧表格 + 右侧固定明细面板 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={15}>
          <Card
            title={`员工工资表 (${visiblePayrollRows.length}/${payrollRows.length})`}
            extra={
              <Space wrap>
                <Input
                  placeholder="搜索姓名或工号"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 150 }}
                  allowClear
                />
                <Select
                  value={viewFilter}
                  onChange={setViewFilter}
                  style={{ width: 120 }}
                  options={[
                    { value: "all", label: "全部员工" },
                    { value: "pending", label: "待确认" },
                    { value: "issues", label: "重点关注" },
                    { value: "resigned", label: "离职员工" },
                  ]}
                />
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Table
              columns={columns}
              dataSource={visiblePayrollRows}
              rowKey={(row) => row.employee.id}
              pagination={{ pageSize: 10 }}
              size="middle"
              rowClassName={(row) =>
                row.employee.id === selectedRow?.employee.id
                  ? "row-status-selected"
                  : row.entry.isComplete
                  ? "row-status-confirmed"
                  : "row-status-pending"
              }
              onRow={(record) => ({
                onClick: () => setSelectedEmployeeId(record.employee.id),
              })}
            />
          </Card>
        </Col>

        {/* 右侧明细面板 - Sticky 固定滚动跟随 */}
        <Col xs={24} xl={9}>
          <div className="sticky-panel">
            {selectedRow ? (
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <Text strong>{selectedRow.employee.name}</Text>
                    <Tag color={selectedRow.employee.isResigned ? "error" : "success"}>
                      {selectedRow.employee.isResigned ? "离职" : "在职"}
                    </Tag>
                  </Space>
                }
                extra={
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openAdjustmentModal(selectedRow.employee)}
                  >
                    调整薪资
                  </Button>
                }
                style={{ borderRadius: 8 }}
              >
                <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="基础工资">
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatCurrency(selectedRow.employee.baseSalary)}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="加班补贴">+{formatCurrency(selectedRow.breakdown.overtimePay)}</Descriptions.Item>
                  <Descriptions.Item label="请假扣减">-{formatCurrency(selectedRow.breakdown.leaveDaysDeduction + selectedRow.breakdown.leaveHoursDeduction)}</Descriptions.Item>
                  <Descriptions.Item label="全勤/稽核">+{formatCurrency(selectedRow.breakdown.attendancePay + selectedRow.breakdown.auditPay)}</Descriptions.Item>
                  <Descriptions.Item label="社保/饭补">+{formatCurrency(selectedRow.breakdown.socialInsurance + selectedRow.breakdown.mealAllowance)}</Descriptions.Item>
                  <Descriptions.Item label="特殊加减项">
                    {selectedRow.breakdown.specialAdjustment >= 0 ? "+" : ""}{formatCurrency(selectedRow.breakdown.specialAdjustment)}
                  </Descriptions.Item>
                  <Descriptions.Item label="本月实发工资小计">
                    <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 700, color: "#1677ff" }}>
                      {formatCurrency(selectedRow.breakdown.netSalary)}
                    </span>
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: "12px 0" }}>特殊调整明细 (奖金/扣款/报销)</Divider>

                {!isLocked && (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 12 }}
                    onClick={() => {
                      resetAdjustmentForm();
                      setAdjustmentFormVisible(true);
                    }}
                  >
                    新增特殊调整项
                  </Button>
                )}

                {/* 调整项编辑弹框 */}
                {adjustmentFormVisible && (
                  <Card size="small" style={{ background: "#fafafa", marginBottom: 12 }}>
                    <form onSubmit={handleSaveAdjustment}>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Space wrap>
                          <select
                            value={adjustmentDraft.category}
                            onChange={(e) => setAdjustmentDraft({ ...adjustmentDraft, category: e.target.value })}
                            style={{ height: 32, borderRadius: 4, padding: "0 8px" }}
                          >
                            {PAYROLL_ADJUSTMENT_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                          <InputNumber
                            placeholder="金额 (元)"
                            min={0.01}
                            step={1}
                            value={adjustmentDraft.amount}
                            onChange={(val) => setAdjustmentDraft({ ...adjustmentDraft, amount: val })}
                            style={{ width: 120 }}
                          />
                        </Space>
                        <Input
                          placeholder="调整原因说明 (如：节日奖金、损耗扣款)"
                          value={adjustmentDraft.reason}
                          onChange={(e) => setAdjustmentDraft({ ...adjustmentDraft, reason: e.target.value })}
                        />
                        <Space justify="end" style={{ width: "100%" }}>
                          <Button size="small" onClick={resetAdjustmentForm}>取消</Button>
                          <Button size="small" type="primary" htmlType="submit">保存调整</Button>
                        </Space>
                      </Space>
                    </form>
                  </Card>
                )}

                {/* 调整项列表 */}
                {selectedAdjustments.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12, display: "block", textAlign: "center" }}>
                    本月无特殊调整记录
                  </Text>
                ) : (
                  selectedAdjustments.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "#f8fafc",
                        borderRadius: 4,
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <Tag color="blue">{PAYROLL_ADJUSTMENT_CATEGORIES.find((c) => c.value === item.category)?.label}</Tag>
                        <Text strong style={{ marginRight: 8 }}>{formatCurrency(item.amount)}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.reason}</Text>
                      </div>
                      {!isLocked && (
                        <Button
                          size="small"
                          type="text"
                          danger
                          onClick={() => handleDeleteAdjustment(item.id)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </Card>
            ) : (
              <Card style={{ borderRadius: 8, textAlign: "center" }}>
                <Text type="secondary">请点击左侧表格中的员工查看发薪明细与调整项</Text>
              </Card>
            )}
          </div>
        </Col>
      </Row>

      {/* 算薪公式拆解 Modal */}
      {formulaModalRow && (
        <Modal
          title={
            <Space>
              <CalculatorOutlined />
              <Text>{formulaModalRow.employee.name} - 本月算薪公式拆解</Text>
            </Space>
          }
          open={Boolean(formulaModalRow)}
          onCancel={() => setFormulaModalRow(null)}
          footer={[<Button key="close" type="primary" onClick={() => setFormulaModalRow(null)}>关闭明细</Button>]}
          width={520}
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="基础工资">{formatCurrency(formulaModalRow.employee.baseSalary)}</Descriptions.Item>
            <Descriptions.Item label="加班工资">
              {formulaModalRow.employee.overtimeRate}元/时 × {formulaModalRow.entry.overtimeHours}时 = +{formatCurrency(formulaModalRow.breakdown.overtimePay)}
            </Descriptions.Item>
            <Descriptions.Item label="请假扣款">
              -{formatCurrency(formulaModalRow.breakdown.leaveDaysDeduction + formulaModalRow.breakdown.leaveHoursDeduction)}
            </Descriptions.Item>
            <Descriptions.Item label="全勤/稽核奖励">
              +{formatCurrency(formulaModalRow.breakdown.attendancePay + formulaModalRow.breakdown.auditPay)}
            </Descriptions.Item>
            <Descriptions.Item label="社保/饭补">
              +{formatCurrency(formulaModalRow.breakdown.socialInsurance + formulaModalRow.breakdown.mealAllowance)}
            </Descriptions.Item>
            <Descriptions.Item label="特殊加减调整">
              {formulaModalRow.breakdown.specialAdjustment >= 0 ? "+" : ""}{formatCurrency(formulaModalRow.breakdown.specialAdjustment)}
            </Descriptions.Item>
            <Descriptions.Item label="本月最终实发工资">
              <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: "#1677ff" }}>
                {formatCurrency(formulaModalRow.breakdown.netSalary)}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </Space>
  );
}
