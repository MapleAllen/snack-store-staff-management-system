import { useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Col, Row, Space, Table, Tag, Typography, Grid } from "antd";
import { ArrowRightOutlined, BarChartOutlined, ShopOutlined } from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import {
  formatCurrency,
  getMonthlyStoreRecord,
  getPayrollCloseBlockers,
  getPayrollStageSummary,
  getStorePayrollRows,
} from "../payrollLogic.js";

const { Text } = Typography;

function getPastMonths(currentMonth, count = 6) {
  const [year, month] = currentMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(year, month - count + index, 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  });
}

function getStageStatus(stage) {
  if (stage.isClosed) return { label: "已月结封账", color: "success" };
  if (stage.unconfiguredCount) return { label: "待设置薪资", color: "warning" };
  if (stage.invalidCount) return { label: "有输入错误", color: "error" };
  if (stage.pendingCount) return { label: "待员工确认", color: "processing" };
  if (stage.employeeCount === 0) return { label: "暂无在职员工", color: "default" };
  return { label: "可月结", color: "success" };
}

export function ReportsPage({ workspace, activeMonth, setActiveMonth, onSelectStore, onNavigate }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [includeArchived, setIncludeArchived] = useState(false);
  const stores = useMemo(
    () => workspace.stores.filter((store) => includeArchived || store.status === "active"),
    [workspace.stores, includeArchived],
  );

  const summaries = useMemo(() => stores.map((store) => {
    const monthlyStore = getMonthlyStoreRecord(workspace, activeMonth, store.id);
    const rows = getStorePayrollRows(workspace, activeMonth, store);
    const stage = getPayrollStageSummary(rows, monthlyStore);
    const blockerCount = rows.filter((row) => getPayrollCloseBlockers(row).length > 0).length;
    const overtimeTotal = rows.reduce((total, row) => total + Number(row.breakdown.overtimePay ?? 0), 0);
    const leaveDeductionTotal = rows.reduce(
      (total, row) => total + Number(row.breakdown.leaveDaysDeduction ?? 0) + Number(row.breakdown.leaveHoursDeduction ?? 0),
      0,
    );
    const payout = monthlyStore.payout ?? null;
    const payoutRows = Object.values(payout?.rows ?? {});
    const paidCount = payoutRows.filter((row) => row.paymentStatus === "paid").length;
    const deliveredCount = payoutRows.filter((row) => ["delivered", "acknowledged"].includes(row.payslipStatus)).length;
    return { store, rows, stage, blockerCount, overtimeTotal, leaveDeductionTotal, payout, paidCount, deliveredCount };
  }), [workspace, activeMonth, stores]);

  const totals = summaries.reduce((result, item) => ({
    forecast: result.forecast + item.stage.forecastTotal,
    confirmed: result.confirmed + item.stage.confirmedTotal,
    closed: result.closed + item.stage.closedTotal,
    blockers: result.blockers + item.blockerCount,
    pending: result.pending + item.stage.pendingCount,
  }), { forecast: 0, confirmed: 0, closed: 0, blockers: 0, pending: 0 });

  const trend = getPastMonths(activeMonth).map((month) => ({
    month,
    total: stores.reduce((total, store) => {
      const monthlyStore = getMonthlyStoreRecord(workspace, month, store.id);
      const stage = getPayrollStageSummary(getStorePayrollRows(workspace, month, store), monthlyStore);
      return total + (stage.isClosed ? stage.closedTotal : stage.confirmedTotal);
    }, 0),
  }));
  const maxTrend = Math.max(1, ...trend.map((item) => item.total));

  const columns = [
    {
      title: "门店",
      key: "store",
      render: (_, item) => <Space><ShopOutlined /><Text strong>{item.store.name}</Text>{item.store.status === "archived" ? <Tag>已停用</Tag> : null}</Space>,
    },
    { title: "核对完成度", key: "completion", render: (_, item) => `${item.stage.confirmedCount} / ${item.stage.employeeCount} 人` },
    { title: "预计实发", key: "forecast", align: "right", render: (_, item) => formatCurrency(item.stage.forecastTotal) },
    { title: "已确认实发", key: "confirmed", align: "right", render: (_, item) => <Text strong>{formatCurrency(item.stage.isClosed ? item.stage.closedTotal : item.stage.confirmedTotal)}</Text> },
    { title: "加班薪资", key: "overtime", align: "right", render: (_, item) => formatCurrency(item.overtimeTotal) },
    { title: "请假扣款", key: "leave", align: "right", render: (_, item) => item.leaveDeductionTotal ? <Text type="warning">-{formatCurrency(item.leaveDeductionTotal)}</Text> : "—" },
    { title: "状态", key: "status", render: (_, item) => { const status = getStageStatus(item.stage); return <Tag color={status.color}>{status.label}</Tag>; } },
    { title: "发薪交付", key: "payout", render: (_, item) => item.stage.isClosed ? item.payout ? <Space direction="vertical" size={0}><Text>{item.paidCount}/{item.stage.employeeCount} 已支付</Text><Text type="secondary">{item.deliveredCount}/{item.stage.employeeCount} 已交工资单</Text></Space> : <Tag color="warning">待创建批次</Tag> : "—" },
    {
      title: "操作",
      key: "action",
      align: "right",
      render: (_, item) => <Button size="small" type="primary" ghost disabled={item.store.status === "archived"} icon={<ArrowRightOutlined />} onClick={() => { onSelectStore(item.store.id); onNavigate("payroll"); }}>进入工资管理</Button>,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="工资报表"
        title="月度工资汇总"
        description="以员工确认和门店月结状态为准；未封账数据仅作为当前月度参考。"
        actions={<Space><input aria-label="工资报表月份" type="month" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)} /><Checkbox checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)}>显示已停用门店</Checkbox></Space>}
      />

      {totals.blockers > 0 ? <Alert showIcon type="warning" message={`本月还有 ${totals.blockers} 位员工未满足月结条件，请先完成薪资设置、考勤修正或员工确认。`} /> : <Alert showIcon type="success" message="当前没有工资月结阻塞项，可继续复核或进入门店工资管理。" />}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><StatCard label="预计实发" value={formatCurrency(totals.forecast)} hint="已通过校验的工资估算" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="已确认实发" value={formatCurrency(totals.confirmed)} hint={`${totals.pending} 位员工待确认`} accent={totals.pending ? "warning" : "success"} /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="已月结封账" value={formatCurrency(totals.closed)} hint="仅封账后写入固定快照" accent="success" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard label="月结阻塞项" value={`${totals.blockers} 人`} hint="需在工资管理中逐项处理" accent={totals.blockers ? "warning" : "success"} /></Col>
      </Row>

      <Card title="门店工资状态" extra={<Tag color="blue">{activeMonth}</Tag>}>
        {isMobile ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {summaries.map((item) => {
              const status = getStageStatus(item.stage);
              return (
                <div className="mobile-record-card mobile-record-card--flat" key={item.store.id}>
                  <div className="mobile-record-heading"><Text strong>{item.store.name}</Text><Tag color={status.color}>{status.label}</Tag></div>
                  <div className="mobile-record-grid">
                    <div><Text type="secondary">核对完成</Text><strong>{item.stage.confirmedCount} / {item.stage.employeeCount} 人</strong></div>
                    <div><Text type="secondary">确认/封账金额</Text><strong>{formatCurrency(item.stage.isClosed ? item.stage.closedTotal : item.stage.confirmedTotal)}</strong></div>
                    <div><Text type="secondary">预计实发</Text><strong>{formatCurrency(item.stage.forecastTotal)}</strong></div>
                    <div><Text type="secondary">请假扣款</Text><strong>{item.leaveDeductionTotal ? `-${formatCurrency(item.leaveDeductionTotal)}` : "—"}</strong></div>
                    <div><Text type="secondary">发薪交付</Text><strong>{item.stage.isClosed ? item.payout ? `${item.paidCount}/${item.stage.employeeCount} 已支付` : "待创建批次" : "月结后开始"}</strong></div>
                  </div>
                  <Button block type="primary" ghost disabled={item.store.status === "archived"} onClick={() => { onSelectStore(item.store.id); onNavigate("payroll"); }}>进入工资管理</Button>
                </div>
              );
            })}
          </Space>
        ) : (
          <Table rowKey={(item) => item.store.id} columns={columns} dataSource={summaries} pagination={false} scroll={{ x: 960 }} locale={{ emptyText: "暂无可显示的门店" }} />
        )}
      </Card>

      <Card title={<Space><BarChartOutlined />近六个月已确认工资趋势</Space>} extra={<Text type="secondary">未封账月份按已确认金额统计</Text>}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {trend.map((item) => (
            <div key={item.month} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", alignItems: "center", gap: 12 }}>
              <Text>{item.month}</Text>
              <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${(item.total / maxTrend) * 100}%`, height: "100%", background: "#1677ff", borderRadius: 6 }} /></div>
              <Text strong className="tabular-nums">{formatCurrency(item.total)}</Text>
            </div>
          ))}
        </Space>
      </Card>
    </Space>
  );
}
