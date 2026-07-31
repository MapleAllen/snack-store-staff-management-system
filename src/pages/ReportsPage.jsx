import { useState } from "react";
import { Card, Table, Tag, Button, Space, Row, Col, Input, Checkbox, Typography, Modal, Select, Descriptions } from "antd";
import {
  ShopOutlined,
  ArrowRightOutlined,
  PrinterOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
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

function getPastMonths(currentMonthStr, count = 6) {
  const [year, month] = currentMonthStr.split("-").map(Number);
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push(mStr);
  }
  return result;
}

export function ReportsPage({ workspace, activeMonth, setActiveMonth, onSelectStore, onNavigate }) {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [salarySlipModalVisible, setSalarySlipModalVisible] = useState(false);
  const [selectedSlipStoreId, setSelectedSlipStoreId] = useState("all");

  const stores = workspace.stores.filter((store) => includeArchived || store.status === "active");

  const summaries = stores.map((store) => {
    const rows = getStorePayrollRows(workspace, activeMonth, store);
    const monthlyStore = getMonthlyStoreRecord(workspace, activeMonth, store.id);
    const stage = getPayrollStageSummary(rows, monthlyStore);
    const blockerRows = rows.filter((row) => getPayrollCloseBlockers(row).length > 0);

    const overtime = rows.reduce((sum, row) => sum + row.breakdown.overtimePay, 0);
    const deductions = rows.reduce((sum, row) => sum + row.breakdown.leaveDaysDeduction + row.breakdown.leaveHoursDeduction, 0);
    const adjustments = rows.reduce((sum, row) => sum + Math.abs(row.breakdown.specialAdjustment), 0);
    return { store, rows, stage, blockerRows, overtime, deductions, adjustments };
  });

  const forecastTotal = summaries.reduce((sum, item) => sum + item.stage.forecastTotal, 0);
  const confirmedTotal = summaries.reduce((sum, item) => sum + item.stage.confirmedTotal, 0);
  const closedTotal = summaries.reduce((sum, item) => sum + item.stage.closedTotal, 0);
  const readyStores = summaries.filter((item) => !item.stage.isClosed && item.rows.length > 0 && item.blockerRows.length === 0);
  const pending = summaries.reduce((sum, item) => sum + item.blockerRows.length, 0);

  // 近 6 个月历史趋势对比计算
  const past6Months = getPastMonths(activeMonth, 6);
  const trendData = past6Months.map((mStr) => {
    let monthTotal = 0;
    stores.forEach((store) => {
      const rows = getStorePayrollRows(workspace, mStr, store);
      const monthlyStore = getMonthlyStoreRecord(workspace, mStr, store.id);
      const stage = getPayrollStageSummary(rows, monthlyStore);
      monthTotal += stage.isClosed ? stage.closedTotal : stage.confirmedTotal;
    });
    return { month: mStr, total: monthTotal };
  });
  const maxTrendTotal = Math.max(...trendData.map((d) => d.total), 1);

  // 收集供工资条弹窗使用的员工列表
  const allRowsForSlips = summaries
    .filter((s) => selectedSlipStoreId === "all" || s.store.id === selectedSlipStoreId)
    .flatMap((s) => s.rows.map((r) => ({ ...r, storeName: s.store.name })));

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
      title: "员工核对完成度",
      key: "count",
      render: (_, record) => `${record.stage.confirmedCount} / ${record.stage.employeeCount} 人已确认`,
    },
    {
      title: "预计实发总额",
      dataIndex: ["stage", "forecastTotal"],
      key: "forecastTotal",
      render: (val) => formatCurrency(val),
    },
    {
      title: "当前实发总额",
      key: "currentTotal",
      render: (_, record) => (
        <span className="tabular-nums" style={{ fontWeight: 700, color: "#1677ff" }}>
          {formatCurrency(record.stage.isClosed ? record.stage.closedTotal : record.stage.confirmedTotal)}
        </span>
      ),
    },
    {
      title: "状态归属",
      key: "status",
      render: (_, item) => {
        const status = item.stage.isClosed
          ? { label: "已月结封账", color: "success" }
          : item.stage.unconfiguredCount
            ? { label: "待设置薪资", color: "warning" }
            : item.stage.invalidCount
              ? { label: "有输入错误", color: "error" }
              : item.stage.pendingCount
                ? { label: "待员工确认", color: "warning" }
                : { label: "可直接月结", color: "success" };

        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      align: "right",
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
        description={`${activeMonth} 区分预计、已确认与已月结封账金额，支持工资条打印与跨月趋势透视。`}
        actions={
          <Space wrap align="center">
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => setSalarySlipModalVisible(true)}>
              查看与打印工资条
            </Button>
            <Input
              type="month"
              value={activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
              style={{ width: 140 }}
            />
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已确认实发" value={formatCurrency(confirmedTotal)} hint={`预计 ${formatCurrency(forecastTotal)}`} accent="primary" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="可直接月结门店" value={`${readyStores.length} 家`} hint={`${summaries.filter((item) => item.stage.isClosed).length} 家已封账`} accent={readyStores.length ? "success" : undefined} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="月结阻塞员工" value={`${pending} 人`} hint="待设薪资、错误或未确认" accent={pending ? "warning" : "success"} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已封账金额" value={formatCurrency(closedTotal)} hint={`全店 ${summaries.length} 家门店`} accent="success" />
        </Col>
      </Row>

      {/* 近 6 个月历史真实对比柱状图 */}
      <Card title={<Space><BarChartOutlined /><Text strong>近 6 个月全店薪资总额走势与对比</Text></Space>} style={{ borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="bottom" style={{ height: 180, paddingTop: 20 }}>
          {trendData.map((d, index) => {
            const heightPercent = Math.max(Math.round((d.total / maxTrendTotal) * 100), 8);
            const isCurrent = d.month === activeMonth;
            const prev = index > 0 ? trendData[index - 1].total : d.total;
            const diff = d.total - prev;

            return (
              <Col xs={12} sm={8} md={4} key={d.month} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#1677ff" : "#595959", marginBottom: 4 }}>
                  {formatCurrency(d.total)}
                </Text>
                
                {/* 柱状条 */}
                <div
                  style={{
                    width: 36,
                    height: `${heightPercent}%`,
                    backgroundColor: isCurrent ? "#1677ff" : "#91caff",
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.3s",
                  }}
                />

                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <Text strong={isCurrent} style={{ fontSize: 13, display: "block" }}>{d.month}</Text>
                  {index > 0 && (
                    <Text type={diff >= 0 ? "danger" : "success"} style={{ fontSize: 11 }}>
                      {diff >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {formatCurrency(Math.abs(diff))}
                    </Text>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 表格卡片头部整合“包含停用门店”开关 */}
      <Card
        title="门店完成度与工资汇总明细"
        extra={
          <Checkbox checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)}>
            包含已停用门店
          </Checkbox>
        }
        style={{ borderRadius: 8 }}
      >
        <Table
          columns={columns}
          dataSource={summaries}
          rowKey={(item) => item.store.id}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 电子工资条 Modal - 支持纯净 @media print 打印 */}
      <Modal
        title={`${activeMonth} 员工个人电子工资条`}
        open={salarySlipModalVisible}
        onCancel={() => setSalarySlipModalVisible(false)}
        width={780}
        footer={[
          <Button key="close" onClick={() => setSalarySlipModalVisible(false)}>关闭</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            打印 / 导出工资条
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Space align="center">
            <Text>按门店筛选工资条：</Text>
            <Select
              value={selectedSlipStoreId}
              onChange={setSelectedSlipStoreId}
              style={{ width: 180 }}
              options={[
                { value: "all", label: "全部门店" },
                ...stores.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Space>
        </Space>

        {/* 专属打印包围盒 */}
        <div className="print-salary-slips" style={{ maxHeight: 520, overflowY: "auto", paddingRight: 8 }}>
          {allRowsForSlips.length === 0 ? (
            <Text type="secondary">当前筛选下没有工资条数据。</Text>
          ) : (
            allRowsForSlips.map((row) => (
              <Card
                key={`${row.storeName}-${row.employee.id}`}
                size="small"
                style={{ marginBottom: 16, borderRadius: 8, borderColor: "#d9d9d9" }}
              >
                <Row justify="space-between" align="middle" style={{ marginBottom: 8, borderBottom: "1px solid #f0f0f0", paddingBottom: 6 }}>
                  <Col>
                    <Text strong style={{ fontSize: 16 }}>{row.employee.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({row.storeName} · 工号 {row.employee.id})</Text>
                  </Col>
                  <Col>
                    <Tag color="blue">{activeMonth} 发薪工资单</Tag>
                  </Col>
                </Row>
                <Descriptions column={3} size="small" bordered>
                  <Descriptions.Item label="基础工资">{formatCurrency(row.employee.baseSalary)}</Descriptions.Item>
                  <Descriptions.Item label="加班补贴">+{formatCurrency(row.breakdown.overtimePay)}</Descriptions.Item>
                  <Descriptions.Item label="考勤扣减">-{formatCurrency(row.breakdown.leaveDaysDeduction + row.breakdown.leaveHoursDeduction)}</Descriptions.Item>
                  <Descriptions.Item label="全勤/稽核">+{formatCurrency(row.breakdown.attendancePay + row.breakdown.auditPay)}</Descriptions.Item>
                  <Descriptions.Item label="社保/饭补">+{formatCurrency(row.breakdown.socialInsurance + row.breakdown.mealAllowance)}</Descriptions.Item>
                  <Descriptions.Item label="特殊调整">{row.breakdown.specialAdjustment >= 0 ? "+" : ""}{formatCurrency(row.breakdown.specialAdjustment)}</Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <Text style={{ fontSize: 13, marginRight: 8 }}>本月实发工资金额：</Text>
                  <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: "#1677ff" }}>
                    {formatCurrency(row.breakdown.netSalary)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </Modal>
    </Space>
  );
}
