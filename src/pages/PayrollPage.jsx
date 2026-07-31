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
  Badge,
  Tooltip,
  Modal,
  Tabs,
  Descriptions,
  Typography,
  Switch,
  Divider,
  Popconfirm,
} from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
  UnlockOutlined,
  ExportOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  CalendarOutlined,
  PayCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import {
  entryHasDraftChanges,
  formatCurrency,
  formatTimestamp,
  createEmployeeDraft,
  entryHasInput,
  getPayrollCloseBlockers,
  getPayrollChangeItems,
  getPayrollIssueMessage,
  getPayrollIssueItems,
  getPayrollReviewStatus,
} from "../payrollLogic.js";
import { VIEW_OPTIONS } from "../payrollData.js";

const { Text, Title, Paragraph } = Typography;

const ENTRY_FIELD_LABELS = {
  overtimeHours: "加班时长",
  leaveDays: "请假天数",
  leaveHours: "请假小时",
  nightShiftHours: "夜班时长",
  specialAdjustment: "特殊加减项",
};

const TRACE_GROUPS = [
  { id: "base", label: "基础项" },
  { id: "deduction", label: "扣减追踪" },
  { id: "addition", label: "增加追踪" },
  { id: "total", label: "实发汇总" },
];

const TRACE_SOURCE_LABELS = {
  "employee.baseSalary": "员工基础工资",
  "employee.overtimeRate": "员工加班时薪",
  "employee.attendanceBonus": "员工全勤奖金",
  "entry.overtimeHours": "本月加班时长",
  "entry.leaveDays": "本月请假天数",
  "entry.leaveHours": "本月请假小时",
  "entry.nightShiftHours": "本月夜班时长",
  "entry.auditPassed": "本月稽核状态",
  "entry.specialAdjustment": "本月特殊加减项",
  "entry.payrollAdjustments": "结构化一次性工资调整",
  "config.leaveDaysDivisor": "门店请假天数除数",
  "config.leaveHoursDivisor": "门店请假小时除数",
  "config.monthDays": "门店每月计薪天数",
  "config.nightShiftRate": "门店夜班补贴",
  "config.auditPassedBonus": "门店稽核达标奖励",
  "config.auditFallbackBonus": "门店稽核未达标保底",
  "config.socialInsuranceBase": "门店社保补助基数",
  "config.mealAllowanceBase": "门店饭补基数",
  "breakdown.leaveDaysDeduction": "请假天数扣减结果",
  "breakdown.leaveHoursDeduction": "请假小时扣减结果",
  "breakdown.overtimePay": "加班工资结果",
  "breakdown.nightShiftPay": "夜班补贴结果",
  "breakdown.attendancePay": "全勤奖金结果",
  "breakdown.auditPay": "稽核奖金结果",
  "breakdown.socialInsurance": "社保补助结果",
  "breakdown.mealAllowance": "饭补结果",
  "breakdown.specialAdjustment": "特殊加减项结果",
};

const PAYROLL_ADJUSTMENT_CATEGORIES = [
  { value: "bonus", label: "奖金" },
  { value: "deduction", label: "扣款" },
  { value: "reimbursement", label: "报销" },
  { value: "correction", label: "修正" },
];

const PAYROLL_ADJUSTMENT_STATUSES = [
  { value: "approved", label: "已批准" },
  { value: "pending", label: "待审批" },
  { value: "rejected", label: "已驳回" },
];

const DEFAULT_PAYROLL_ADJUSTMENT_DRAFT = {
  category: "bonus",
  amount: "",
  reason: "",
  status: "pending",
};

function issueMessage(issue) {
  return getPayrollIssueMessage(issue);
}

function makePayrollAdjustmentId() {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `payroll-adjustment-${value}`;
}

function getPayrollAdjustments(entry) {
  return Array.isArray(entry?.payrollAdjustments) ? entry.payrollAdjustments : [];
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getAdjustmentImpact(adjustment) {
  const amount = Number(adjustment?.amount) || 0;
  return adjustment?.category === "deduction" ? -amount : amount;
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

  const [adjustmentFormVisible, setAdjustmentFormVisible] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState(DEFAULT_PAYROLL_ADJUSTMENT_DRAFT);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState(null);

  const isClosed = monthlyStore?.status === "closed";

  const blockerRows = payrollRows.filter((row) => row.closeBlockers.length > 0);
  const reviewRows = payrollRows.filter((row) => row.employee.salaryConfigured && row.issueItems.length > 0);
  const cleanRows = payrollRows.filter((row) => row.employee.salaryConfigured && row.closeBlockers.length === 0 && row.issueItems.length === 0);

  const visiblePayrollRows = payrollRows.filter((row) => {
    if (searchTerm && !row.employee.name.includes(searchTerm.trim())) return false;
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
      title: "员工姓名",
      dataIndex: ["employee", "name"],
      key: "name",
      width: 130,
      render: (text, record) => {
        const status = record.reviewStatus;
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{text}</Text>
            <Tag color={status.tone === "success" ? "success" : status.tone === "warning" ? "warning" : "default"}>
              {status.label}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "加班时长",
      key: "overtimeHours",
      width: 110,
      render: (_, record) => (
        <InputNumber
          disabled={isLocked}
          min={0}
          step={0.5}
          size="small"
          value={record.entry.overtimeHours}
          onChange={(val) => patchMonthlyEntry(record.employee.id, { overtimeHours: val ?? 0 })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: "请假天数",
      key: "leaveDays",
      width: 100,
      render: (_, record) => (
        <InputNumber
          disabled={isLocked}
          min={0}
          step={0.5}
          size="small"
          value={record.entry.leaveDays}
          onChange={(val) => patchMonthlyEntry(record.employee.id, { leaveDays: val ?? 0 })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: "请假小时",
      key: "leaveHours",
      width: 100,
      render: (_, record) => (
        <InputNumber
          disabled={isLocked}
          min={0}
          step={0.5}
          size="small"
          value={record.entry.leaveHours}
          onChange={(val) => patchMonthlyEntry(record.employee.id, { leaveHours: val ?? 0 })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    ...(activeStore.config.nightShiftRate > 0
      ? [
          {
            title: "夜班时长",
            key: "nightShiftHours",
            width: 100,
            render: (_, record) => (
              <InputNumber
                disabled={isLocked}
                min={0}
                step={0.5}
                size="small"
                value={record.entry.nightShiftHours}
                onChange={(val) => patchMonthlyEntry(record.employee.id, { nightShiftHours: val ?? 0 })}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          },
        ]
      : []),
    {
      title: "稽核",
      key: "auditPassed",
      width: 90,
      render: (_, record) => (
        <Switch
          disabled={isLocked}
          size="small"
          checked={record.entry.auditPassed}
          checkedChildren="达"
          unCheckedChildren="否"
          onChange={(checked) => patchMonthlyEntry(record.employee.id, { auditPassed: checked })}
          onClick={(_, e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: "特殊调整",
      key: "specialAdjustment",
      width: 110,
      render: (_, record) => (
        <InputNumber
          disabled={isLocked}
          step={10}
          size="small"
          value={record.entry.specialAdjustment}
          onChange={(val) => patchMonthlyEntry(record.employee.id, { specialAdjustment: val ?? 0 })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: "确认完成",
      key: "isComplete",
      width: 130,
      render: (_, record) => {
        const disabled = isLocked || (!record.entry.isComplete && record.validationIssues.length > 0) || !record.employee.salaryConfigured;
        return (
          <Button
            size="small"
            type={record.entry.isComplete ? "primary" : "default"}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleEntryComplete(record.employee.id, !record.entry.isComplete);
            }}
          >
            {record.entry.isComplete ? "已确认" : "点此确认"}
          </Button>
        );
      },
    },
    {
      title: "实发工资",
      key: "netSalary",
      width: 120,
      render: (_, record) => (
        <Text strong style={{ color: record.employee.salaryConfigured ? "#1677ff" : "#fa8c16" }}>
          {record.employee.salaryConfigured ? formatCurrency(record.breakdown.netSalary) : "待设置"}
        </Text>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* 头部页面属性与导出行 */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" size="middle">
              <Tag color="geekblue" style={{ fontSize: 14, padding: "4px 8px" }}>{activeStore.name}</Tag>
              <Input
                type="month"
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                style={{ width: 140 }}
              />
              {isClosed ? (
                <Tag color="success" icon={<LockOutlined />}>已月结封账</Tag>
              ) : (
                <Tag color="processing" icon={<UnlockOutlined />}>算薪核对中</Tag>
              )}
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Button icon={<ExportOutlined />} onClick={exportCurrentMonth}>
                {isClosed ? "导出月结工资表" : "导出草稿"}
              </Button>
              {isClosed ? (
                <Button danger icon={<UnlockOutlined />} onClick={onUnlockPayroll}>
                  解锁本月工资
                </Button>
              ) : (
                <Button type="primary" icon={<LockOutlined />} onClick={onClosePayroll}>
                  确认本月月结
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4.8}>
          <StatCard label="本月实发小计" value={formatCurrency(totalNetSalary)} hint={`预计总额 ${formatCurrency(forecastNetSalary)}`} accent="primary" />
        </Col>
        <Col xs={24} sm={12} lg={4.8}>
          <StatCard label="月结阻塞" value={`${blockerRows.length} 人`} hint="待确认或薪资未设置" accent={blockerRows.length ? "warning" : "success"} />
        </Col>
        <Col xs={24} sm={12} lg={4.8}>
          <StatCard label="确认完成度" value={`${completionRate}%`} hint={`已确认 ${touchedRows.length}/${payrollRows.length} 人`} accent={completionRate === 100 ? "success" : "default"} />
        </Col>
        <Col xs={24} sm={12} lg={4.8}>
          <StatCard label="待复核变动" value={`${exceptionCount} 人`} hint="含请假、调薪或未达标" accent={exceptionCount ? "warning" : "success"} />
        </Col>
        <Col xs={24} sm={12} lg={4.8}>
          <StatCard label="月结状态" value={isClosed ? "已月结" : "未月结"} hint={monthlyStore?.closedAt ? `结账于 ${new Date(monthlyStore.closedAt).toLocaleDateString()}` : "可随时进行核算"} accent={isClosed ? "success" : "default"} />
        </Col>
      </Row>

      {/* 老板阻碍项提示 Header Alert */}
      {blockerRows.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`当前有 ${blockerRows.length} 位员工阻塞月结`}
          description={
            <Space wrap style={{ marginTop: 4 }}>
              {blockerRows.map((r) => (
                <Tag color="error" key={r.employee.id}>
                  {r.employee.name}: {r.closeBlockers.map(issueMessage).join("、")}
                </Tag>
              ))}
            </Space>
          }
        />
      ) : isClosed ? (
        <Alert type="success" showIcon icon={<LockOutlined />} message="本月工资已冻结，如需变更请点击上方“解锁本月工资”。" />
      ) : (
        <Alert type="info" showIcon icon={<CheckCircleOutlined />} message="无阻塞项，全部员工确认完成后即可点击“确认本月月结”。" />
      )}

      {/* 左右分栏工作台 Workspace */}
      <Row gutter={[16, 16]}>
        {/* 左侧主算薪列表 */}
        <Col xs={24} xl={16}>
          <Card
            title="算薪主工作台"
            extra={
              <Space wrap>
                <Input
                  placeholder="搜索员工"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 140 }}
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
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => setSelectedEmployeeId(record.employee.id),
                style: {
                  cursor: "pointer",
                  background: record.employee.id === selectedRow?.employee.id ? "#e6f4ff" : undefined,
                },
              })}
            />
          </Card>
        </Col>

        {/* 右侧选中员工算薪明细 & 调薪记录 */}
        <Col xs={24} xl={8}>
          {selectedRow ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <Text strong>{selectedRow.employee.name}</Text>
                    <Tag color={selectedRow.employee.salaryConfigured ? "blue" : "warning"}>
                      {selectedRow.employee.salaryConfigured ? "已设薪资" : "薪资待设置"}
                    </Tag>
                  </Space>
                }
                extra={
                  <Button size="small" icon={<EditOutlined />} onClick={() => openAdjustmentModal(selectedRow.employee)}>
                    调薪/初始薪资
                  </Button>
                }
                style={{ borderRadius: 8 }}
              >
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="基础工资">{formatCurrency(selectedRow.employee.baseSalary)}</Descriptions.Item>
                  <Descriptions.Item label="加班时薪">{selectedRow.employee.overtimeRate} 元/时</Descriptions.Item>
                  <Descriptions.Item label="全勤奖金">{formatCurrency(selectedRow.employee.attendanceBonus)}</Descriptions.Item>
                  <Descriptions.Item label="考勤扣减">
                    {formatCurrency(selectedRow.breakdown.leaveDaysDeduction + selectedRow.breakdown.leaveHoursDeduction)}
                  </Descriptions.Item>
                  <Descriptions.Item label="加班补贴">{formatCurrency(selectedRow.breakdown.overtimePay)}</Descriptions.Item>
                  <Descriptions.Item label="社保+饭补">
                    {formatCurrency(selectedRow.breakdown.socialInsurance + selectedRow.breakdown.mealAllowance)}
                  </Descriptions.Item>
                  <Descriptions.Item label="实发工资">
                    <Text strong style={{ fontSize: 16, color: "#1677ff" }}>
                      {selectedRow.employee.salaryConfigured ? formatCurrency(selectedRow.breakdown.netSalary) : "待设置"}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* 结构化一次性调薪记录列表 */}
                <Divider style={{ margin: "16px 0 12px 0" }} />
                <Space justify="space-between" style={{ width: "100%", marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>本月一次性奖惩/调整</Text>
                  {!isLocked && (
                    <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => setAdjustmentFormVisible(true)}>
                      添加调整
                    </Button>
                  )}
                </Space>

                {adjustmentFormVisible && (
                  <Card size="small" style={{ background: "#fafafa", marginBottom: 12 }}>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Select
                        value={adjustmentDraft.category}
                        onChange={(v) => setAdjustmentDraft((c) => ({ ...c, category: v }))}
                        options={PAYROLL_ADJUSTMENT_CATEGORIES}
                        style={{ width: "100%" }}
                      />
                      <InputNumber
                        placeholder="金额"
                        value={adjustmentDraft.amount}
                        onChange={(v) => setAdjustmentDraft((c) => ({ ...c, amount: v }))}
                        style={{ width: "100%" }}
                      />
                      <Input
                        placeholder="备注原因"
                        value={adjustmentDraft.reason}
                        onChange={(e) => setAdjustmentDraft((c) => ({ ...c, reason: e.target.value }))}
                      />
                      <Space justify="end" style={{ width: "100%" }}>
                        <Button size="small" onClick={resetAdjustmentForm}>取消</Button>
                        <Button size="small" type="primary" onClick={handleSaveAdjustment}>保存</Button>
                      </Space>
                    </Space>
                  </Card>
                )}

                {selectedAdjustments.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>本月暂无一次性调整。</Text>
                ) : (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {selectedAdjustments.map((item) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                        <div>
                          <Tag size="small" color={item.category === "bonus" ? "green" : "volcano"}>
                            {getOptionLabel(PAYROLL_ADJUSTMENT_CATEGORIES, item.category)}
                          </Tag>
                          <Text>{item.reason || "无说明"}</Text>
                        </div>
                        <Space>
                          <Text strong style={{ color: item.category === "deduction" ? "#ff4d4f" : "#52c41a" }}>
                            {item.category === "deduction" ? `-￥${item.amount}` : `+￥${item.amount}`}
                          </Text>
                          {!isLocked && (
                            <Popconfirm title="确定删除该调整？" onConfirm={() => handleDeleteAdjustment(item.id)}>
                              <Button type="text" danger size="small" style={{ padding: 0 }}>×</Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Space>
          ) : (
            <Card style={{ borderRadius: 8, textAlign: "center", padding: 40 }}>
              <InfoCircleOutlined style={{ fontSize: 32, color: "#bfbfbf", marginBottom: 12 }} />
              <Paragraph type="secondary">点击左侧列表中的员工查看详细计算轨迹与调薪。</Paragraph>
            </Card>
          )}
        </Col>
      </Row>
    </Space>
  );
}
