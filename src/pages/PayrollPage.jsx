import { useEffect, useMemo, useState } from "react";
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
  Grid,
  Steps,
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
  PrinterOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { StatCard } from "../components/StatCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import {
  formatCurrency,
  getPayrollCloseBlockers,
  getPayrollIssueItems,
  getPayrollIssueMessage,
  getPayrollReviewStatus,
} from "../payrollLogic.js";
import {
  MONTHLY_PAYROLL_ADJUSTMENT_REASONS,
  PAYOUT_METHODS,
} from "../payrollData.js";

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
  reason: MONTHLY_PAYROLL_ADJUSTMENT_REASONS[0],
  status: "pending",
};

const PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "待支付" },
  { value: "paid", label: "已支付" },
  { value: "failed", label: "支付失败" },
];

const PAYSLIP_STATUS_OPTIONS = [
  { value: "not-delivered", label: "工资单待交付" },
  { value: "delivered", label: "工资单已交付" },
  { value: "acknowledged", label: "员工已确认" },
];

function makePayrollAdjustmentId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
  onCreatePayout,
  onUpdatePayoutRow,
}) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.xl;
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [formulaModalRow, setFormulaModalRow] = useState(null);
  const [payoutModal, setPayoutModal] = useState(null);

  const [adjustmentFormVisible, setAdjustmentFormVisible] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState(DEFAULT_PAYROLL_ADJUSTMENT_DRAFT);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState(null);

  const payrollViewRows = useMemo(() => payrollRows.map((row) => ({
    ...row,
    closeBlockers: getPayrollCloseBlockers(row),
    issueItems: getPayrollIssueItems(row),
    reviewStatus: getPayrollReviewStatus(row),
  })), [payrollRows]);

  const isClosed = monthlyStore?.status === "closed";
  const blockerRows = payrollViewRows.filter((row) => row.closeBlockers.length > 0);
  const reviewRows = payrollViewRows.filter((row) => row.employee.salaryConfigured && row.issueItems.length > 0);
  const pendingCount = payrollViewRows.filter((row) => !row.entry.isComplete).length;
  const canClose = blockerRows.length === 0;

  const visiblePayrollRows = useMemo(() => payrollViewRows.filter((row) => {
    const keyword = searchTerm.trim().toLowerCase();
    if (keyword && !row.employee.name.toLowerCase().includes(keyword) && !row.employee.id.toLowerCase().includes(keyword)
      && !`${row.employee.employeeNumber ?? ""}`.toLowerCase().includes(keyword) && !`${row.employee.phone ?? ""}`.includes(keyword)) {
      return false;
    }
    if (viewFilter === "pending") return !row.entry.isComplete;
    if (viewFilter === "issues") return row.closeBlockers.length > 0 || row.issueItems.length > 0;
    if (viewFilter === "resigned") return row.employee.isResigned;
    return true;
  }), [payrollViewRows, searchTerm, viewFilter]);

  useEffect(() => {
    const targetId = selectedRow?.employee?.id;
    if (!targetId) return;
    const index = visiblePayrollRows.findIndex((row) => row.employee.id === targetId);
    if (index >= 0) {
      const page = Math.floor(index / 10) + 1;
      setCurrentPage((prev) => (prev !== page ? page : prev));
    }
  }, [selectedRow?.employee?.id, visiblePayrollRows]);

  const selectedAdjustments = getPayrollAdjustments(selectedRow?.entry);
  const payout = monthlyStore?.payout ?? null;
  const payoutRows = payrollViewRows.map((row) => ({ ...row, payout: payout?.rows?.[row.employee.id] ?? null }));
  const paidCount = payoutRows.filter((row) => row.payout?.paymentStatus === "paid").length;
  const deliveredCount = payoutRows.filter((row) => ["delivered", "acknowledged"].includes(row.payout?.payslipStatus)).length;
  const workflowStep = !isClosed
    ? pendingCount > 0 ? 0 : 1
    : !payout ? 2
      : payout.status !== "paid" || deliveredCount < payoutRows.length ? 3 : 4;

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
      title: "姓名与状态",
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
        const confirmationIssues = record.validationIssues ?? [];
        const disabled = isClosed || (!record.entry.isComplete && confirmationIssues.length > 0);
        const blockerMsg = confirmationIssues.length ? getPayrollIssueMessage(confirmationIssues[0]) : "";

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
            danger={confirmationIssues.length > 0}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleEntryComplete(record.employee.id, true);
            }}
          >
            {confirmationIssues.length ? "有输入错误" : "点此确认"}
          </Button>
        );

        return confirmationIssues.length && !record.entry.isComplete ? (
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

      <Card size="small" className="workflow-steps">
        <Steps
          size="small"
          current={workflowStep}
          responsive={false}
          items={[
            { title: "考勤" },
            { title: "复核" },
            { title: "月结" },
            { title: "发薪" },
            { title: "完成" },
          ]}
        />
      </Card>

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

      {isClosed ? (
        <Card
          className="payout-workspace"
          title={<Space><SendOutlined /><Text strong>发薪与工资单交付</Text></Space>}
          extra={
            <Space wrap>
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印全部工资单</Button>
              {!payout ? (
                <Button
                  type="primary"
                  onClick={() => setPayoutModal({
                    plannedPayDate: `${activeMonth}-28`,
                    method: PAYOUT_METHODS[0],
                    reference: "",
                  })}
                >
                  创建发薪批次
                </Button>
              ) : null}
            </Space>
          }
        >
          {!payout ? (
            <Alert
              showIcon
              type="info"
              message="工资已冻结，下一步是创建发薪批次"
              description="设置计划发薪日和线下支付方式后，逐人记录支付结果与工资单交付状态。"
            />
          ) : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div className="payout-summary">
                <div><Text type="secondary">批次状态</Text><Tag color={payout.status === "paid" ? "success" : payout.status === "in-progress" ? "processing" : "warning"}>{payout.status === "paid" ? "全部已支付" : payout.status === "in-progress" ? "发薪处理中" : "待开始发薪"}</Tag></div>
                <div><Text type="secondary">计划发薪日</Text><strong>{payout.plannedPayDate}</strong></div>
                <div><Text type="secondary">支付方式</Text><strong>{payout.method}</strong></div>
                <div><Text type="secondary">交付进度</Text><strong>{paidCount}/{payoutRows.length} 已支付 · {deliveredCount}/{payoutRows.length} 已交工资单</strong></div>
              </div>
              {payout.reference ? <Text type="secondary">批次参考号：{payout.reference}</Text> : null}
              <div className="payout-roster">
                {payoutRows.map((row) => (
                  <div className="payout-roster__row" key={row.employee.id}>
                    <div className="payout-roster__employee"><Text strong>{row.employee.name}</Text><Text type="secondary">{formatCurrency(row.breakdown.netSalary)}</Text></div>
                    <Select
                      aria-label={`${row.employee.name} 支付状态`}
                      value={row.payout?.paymentStatus ?? "pending"}
                      options={PAYMENT_STATUS_OPTIONS}
                      onChange={(paymentStatus) => onUpdatePayoutRow(row.employee.id, paymentStatus, row.payout?.payslipStatus ?? "not-delivered")}
                    />
                    <Select
                      aria-label={`${row.employee.name} 工资单状态`}
                      value={row.payout?.payslipStatus ?? "not-delivered"}
                      options={PAYSLIP_STATUS_OPTIONS}
                      onChange={(payslipStatus) => onUpdatePayoutRow(row.employee.id, row.payout?.paymentStatus ?? "pending", payslipStatus)}
                    />
                  </div>
                ))}
              </div>
            </Space>
          )}
        </Card>
      ) : null}

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
            title={`员工工资表 (${visiblePayrollRows.length}/${payrollViewRows.length})`}
            extra={
              <Space wrap>
                <Input
                  placeholder="搜索姓名、工号或手机号"
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
            {isMobile ? (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {visiblePayrollRows.map((row) => {
                  const confirmationIssues = row.validationIssues ?? [];
                  const confirmationDisabled = isClosed || (!row.entry.isComplete && confirmationIssues.length > 0);
                  return (
                    <div
                      key={row.employee.id}
                      className={`mobile-record-card mobile-record-card--flat ${row.employee.id === selectedRow?.employee.id ? "mobile-record-card--selected" : ""}`}
                      onClick={() => setSelectedEmployeeId(row.employee.id)}
                    >
                      <div className="mobile-record-heading">
                        <div><Text strong>{row.employee.name}</Text><Text type="secondary">{row.reviewStatus.summary}</Text></div>
                        <Tag color={row.reviewStatus.tone === "success" ? "success" : row.reviewStatus.tone === "danger" ? "error" : "warning"}>{row.reviewStatus.label}</Tag>
                      </div>
                      <div className="mobile-payroll-amount">
                        <Text type="secondary">本月实发</Text>
                        <strong>{row.employee.salaryConfigured ? formatCurrency(row.breakdown.netSalary) : "待设置薪资"}</strong>
                      </div>
                      <Space wrap size={[4, 4]}>
                        {row.breakdown.overtimeHours > 0 ? <Tag color="blue">加班 {row.breakdown.overtimeHours}h</Tag> : null}
                        {row.breakdown.leaveDays > 0 ? <Tag color="orange">请假 {row.breakdown.leaveDays}天</Tag> : null}
                        {row.breakdown.specialAdjustment !== 0 ? <Tag color="purple">调整 {formatCurrency(row.breakdown.specialAdjustment)}</Tag> : null}
                        {!row.breakdown.overtimeHours && !row.breakdown.leaveDays && !row.breakdown.specialAdjustment ? <Text type="secondary">考勤正常，无特殊调整</Text> : null}
                      </Space>
                      <Button
                        block
                        type={row.entry.isComplete ? "primary" : "default"}
                        disabled={confirmationDisabled}
                        danger={!row.entry.isComplete && confirmationIssues.length > 0}
                        icon={row.entry.isComplete ? <CheckCircleOutlined /> : null}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleEntryComplete(row.employee.id, !row.entry.isComplete);
                        }}
                      >
                        {row.entry.isComplete ? "已确认，点击重新核对" : confirmationIssues.length ? getPayrollIssueMessage(confirmationIssues[0]) : "确认该员工工资"}
                      </Button>
                    </div>
                  );
                })}
              </Space>
            ) : (
              <Table
                columns={columns}
                dataSource={visiblePayrollRows}
                rowKey={(row) => row.employee.id}
                pagination={{ current: currentPage, pageSize: 10, onChange: (page) => setCurrentPage(page) }}
                size="middle"
                rowClassName={(row) => row.employee.id === selectedRow?.employee.id ? "row-status-selected" : row.entry.isComplete ? "row-status-confirmed" : "row-status-pending"}
                onRow={(record) => ({ onClick: () => setSelectedEmployeeId(record.employee.id) })}
              />
            )}
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
                        <Select
                          placeholder="选择标准业务原因"
                          value={adjustmentDraft.reason}
                          options={MONTHLY_PAYROLL_ADJUSTMENT_REASONS.map((reason) => ({ value: reason, label: reason }))}
                          onChange={(reason) => setAdjustmentDraft({ ...adjustmentDraft, reason })}
                          style={{ width: "100%" }}
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

      {payoutModal ? (
        <Modal title="创建发薪批次" open onCancel={() => setPayoutModal(null)} footer={null} width={480}>
          <form
            className="modal-form"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                onCreatePayout(payoutModal);
                setPayoutModal(null);
              } catch {}
            }}
          >
            <Alert type="info" showIcon message={`${activeStore.name} · ${activeMonth} · ${payrollRows.length} 位员工`} description={`冻结实发合计 ${formatCurrency(forecastNetSalary)}`} />
            <label className="field"><span>计划发薪日期</span><Input type="date" required value={payoutModal.plannedPayDate} onChange={(event) => setPayoutModal((current) => ({ ...current, plannedPayDate: event.target.value }))} /></label>
            <label className="field"><span>支付方式</span><Select value={payoutModal.method} options={PAYOUT_METHODS.map((method) => ({ value: method, label: method }))} onChange={(method) => setPayoutModal((current) => ({ ...current, method }))} /></label>
            <label className="field"><span>批次参考号（选填）</span><Input maxLength={80} value={payoutModal.reference} onChange={(event) => setPayoutModal((current) => ({ ...current, reference: event.target.value }))} placeholder="例如银行批次号或线下凭证编号" /></label>
            <div className="modal-actions"><Button onClick={() => setPayoutModal(null)}>取消</Button><Button type="primary" htmlType="submit">创建批次</Button></div>
          </form>
        </Modal>
      ) : null}

      {isClosed ? (
        <section className="print-salary-slips" aria-hidden="true">
          {payrollRows.map((row) => (
            <article className="salary-slip" key={row.employee.id}>
              <header><div><h1>门店工资助手 · 个人工资单</h1><p>{activeStore.name} · {activeMonth}</p></div><strong>{row.employee.name}</strong></header>
              <div className="salary-slip__grid">
                <span>基础工资</span><strong>{formatCurrency(row.employee.baseSalary)}</strong>
                <span>加班与夜班补贴</span><strong>+{formatCurrency(row.breakdown.overtimePay + row.breakdown.nightShiftPay)}</strong>
                <span>全勤、稽核与饭补</span><strong>+{formatCurrency(row.breakdown.attendancePay + row.breakdown.auditPay + row.breakdown.mealAllowance)}</strong>
                <span>固定社保贡献</span><strong>+{formatCurrency(row.breakdown.socialInsurance)}</strong>
                <span>请假扣减</span><strong>-{formatCurrency(row.breakdown.leaveDaysDeduction + row.breakdown.leaveHoursDeduction)}</strong>
                <span>特殊调整</span><strong>{row.breakdown.specialAdjustment >= 0 ? "+" : ""}{formatCurrency(row.breakdown.specialAdjustment)}</strong>
                <span className="salary-slip__total">本月实发</span><strong className="salary-slip__total">{formatCurrency(row.breakdown.netSalary)}</strong>
              </div>
              <footer>状态：正式 · 已月结　公式版本：{row.formulaMetadata?.version ?? "core-payroll-v1"}　打印时间：{new Date().toLocaleString("zh-CN")}</footer>
            </article>
          ))}
        </section>
      ) : null}

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
