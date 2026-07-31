import { useState } from "react";
import { Card, Table, Tag, Button, Space, Row, Col, Input, Checkbox, Progress, Typography, Tooltip } from "antd";
import {
  ShopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import {
  formatCurrency,
  getMonthlyStoreRecord,
  getPayrollCloseBlockers,
  getPayrollIssueMessage,
  getPayrollIssueItems,
  getPayrollStageSummary,
  getStorePayrollRows,
} from "../payrollLogic.js";

const { Text, Paragraph } = Typography;

export function ReportsPage({ workspace, activeMonth, setActiveMonth, onSelectStore, onNavigate }) {
  const [includeArchived, setIncludeArchived] = useState(false);
  const stores = workspace.stores.filter((store) => includeArchived || store.status === "active");

  const summaries = stores.map((store) => {
    const rows = getStorePayrollRows(workspace, activeMonth, store);
    const monthlyStore = getMonthlyStoreRecord(workspace, activeMonth, store.id);
    const stage = getPayrollStageSummary(rows, monthlyStore);
    const blockerRows = rows.filter((row) => getPayrollCloseBlockers(row).length > 0);
    const reviewRows = rows.filter((row) => row.employee.salaryConfigured && getPayrollIssueItems(row).length > 0);
    const overtime = rows.reduce((sum, row) => sum + row.breakdown.overtimePay, 0);
    const deductions = rows.reduce((sum, row) => sum + row.breakdown.leaveDaysDeduction + row.breakdown.leaveHoursDeduction, 0);
    const adjustments = rows.reduce((sum, row) => sum + Math.abs(row.breakdown.specialAdjustment), 0);
    return { store, rows, stage, blockerRows, reviewRows, overtime, deductions, adjustments };
  });

  const forecastTotal = summaries.reduce((sum, item) => sum + item.stage.forecastTotal, 0);
  const confirmedTotal = summaries.reduce((sum, item) => sum + item.stage.confirmedTotal, 0);
  const closedTotal = summaries.reduce((sum, item) => sum + item.stage.closedTotal, 0);
  const readyStores = summaries.filter((item) => !item.stage.isClosed && item.rows.length > 0 && item.blockerRows.length === 0);
  const pending = summaries.reduce((sum, item) => sum + item.blockerRows.length, 0);
  const reviewCount = summaries.reduce((sum, item) => sum + item.reviewRows.length, 0);

  const columns = [
    {
      title: "门店名称",
      dataIndex: ["store", "name"],
      key: "name",
      render: (text, record) => (
        <Space>
          <ShopOutlined />
          <Text strong>{text}</Text>
          {record.store.status === "archived" && <Tag color="default">已停用</Tag>}
        </Space>
      ),
    },
    {
      title: "在岗人数 / 已确认",
      key: "count",
      render: (_, record) => `${record.stage.confirmedCount} / ${record.stage.employeeCount} 人`,
    },
    {
      title: "预计实发",
      dataIndex: ["stage", "forecastTotal"],
      key: "forecastTotal",
      render: (val) => formatCurrency(val),
    },
    {
      title: "当前实发",
      key: "currentTotal",
      render: (_, record) => (
        <Text strong style={{ color: "#1677ff" }}>
          {formatCurrency(record.stage.isClosed ? record.stage.closedTotal : record.stage.confirmedTotal)}
        </Text>
      ),
    },
    {
      title: "状态",
      key: "status",
      render: (_, item) => {
        const status = item.stage.isClosed
          ? { label: "已月结", color: "success" }
          : item.stage.unconfiguredCount
            ? { label: "待设置薪资", color: "warning" }
            : item.stage.invalidCount
              ? { label: "有输入错误", color: "error" }
              : item.stage.pendingCount
                ? { label: "待员工确认", color: "processing" }
                : item.reviewRows.length > 0
                  ? { label: "已确认待复核", color: "warning" }
                  : { label: "可直接月结", color: "success" };

        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: "关键变动 (加班/请假/调整)",
      key: "drivers",
      render: (_, item) => (
        <Space split={<Text type="secondary">|</Text>} size="small" style={{ fontSize: 12 }}>
          <span>加班 {formatCurrency(item.overtime)}</span>
          <span>扣减 {formatCurrency(item.deductions)}</span>
          <span>调整 {formatCurrency(item.adjustments)}</span>
        </Space>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, item) => (
        <Button
          size="small"
          type="primary"
          ghost
          disabled={item.store.status === "archived"}
          icon={<ArrowRightOutlined />}
          onClick={() => {
            onSelectStore(item.store.id);
            onNavigate("payroll");
          }}
        >
          进工作台
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="报表中心"
        title="门店工资报表中心"
        description={`${activeMonth} 区分预计、已确认与已月结金额，清晰透视各门店封账进度。`}
        actions={
          <Space wrap align="center">
            <Input
              type="month"
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              style={{ width: 140 }}
            />
            <Checkbox checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)}>
              包含停用门店
            </Checkbox>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已确认实发" value={formatCurrency(confirmedTotal)} hint={`预计 ${formatCurrency(forecastTotal)}`} accent="primary" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="可直接月结门店" value={`${readyStores.length} 家`} hint={`${summaries.filter((item) => item.stage.isClosed).length} 家已冻结`} accent={readyStores.length ? "success" : undefined} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="月结阻塞员工" value={`${pending} 人`} hint="未设置薪资、输入有误或未确认" accent={pending ? "warning" : "success"} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="待复核变化" value={`${reviewCount} 人`} hint={`已月结实发 ${formatCurrency(closedTotal)}`} accent={reviewCount ? "warning" : "success"} />
        </Col>
      </Row>

      <Card title="门店完成度与工资汇总明细" style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={summaries}
          rowKey={(item) => item.store.id}
          pagination={false}
          size="middle"
        />
      </Card>
    </Space>
  );
}
