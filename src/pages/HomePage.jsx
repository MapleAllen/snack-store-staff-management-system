import { Card, Row, Col, Button, Tag, Alert, Statistic, List, Space, Typography, Progress } from "antd";
import {
  RightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { StatCard } from "../components/StatCard.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import {
  formatCurrency,
  getPayrollIssueMessage,
  getPayrollMonthCloseReadiness,
} from "../payrollLogic.js";

const { Title, Text, Paragraph } = Typography;

function getPreviousMonthStr(monthStr) {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
}

export function HomePage({ workspace, activeMonth, onNavigate, onSelectStore }) {
  const readiness = getPayrollMonthCloseReadiness(workspace, activeMonth);
  const previousMonthStr = getPreviousMonthStr(activeMonth);
  const prevReadiness = getPayrollMonthCloseReadiness(workspace, previousMonthStr);

  const storeSummaries = readiness.stores;
  const totalForecast = readiness.totals.estimated;
  const totalConfirmed = readiness.totals.confirmed;
  const totalClosed = readiness.totals.closed;
  const totalEmployees = readiness.employeeCount;
  const totalUnconfigured = readiness.unconfiguredCount;
  const totalPending = readiness.pendingCount;
  const totalInvalid = readiness.invalidCount;
  const totalExceptions = readiness.reviewCount;
  const totalBlockers = readiness.blockerRowCount;
  const readyStores = storeSummaries.filter((item) => item.status === "ready");
  const closedStores = readiness.closedCount;

  const prevForecast = prevReadiness.totals.estimated;
  const momDiff = totalForecast - prevForecast;
  const momPercent = prevForecast ? ((momDiff / prevForecast) * 100).toFixed(1) : 0;

  const nextUnconfigured = storeSummaries.find((item) => item.unconfiguredCount > 0);
  const nextInvalid = storeSummaries.find((item) => item.invalidCount > 0);
  const nextPending = storeSummaries.find((item) => item.pendingCount > 0);
  const nextIssue = storeSummaries.find((item) => item.reviewCount > 0);
  const nextReady = readyStores[0];
  const recommendedAction = totalUnconfigured
    ? { label: "先补薪资设置", hint: `${totalUnconfigured} 位员工还不能进入确认`, storeId: nextUnconfigured?.storeId }
    : totalInvalid
      ? { label: "先修正输入错误", hint: `${totalInvalid} 条数据需要先修正`, storeId: nextInvalid?.storeId }
      : totalPending
        ? { label: "逐个确认员工", hint: `还有 ${totalPending} 位员工还没点确认完成`, storeId: nextPending?.storeId }
        : totalExceptions
          ? { label: "复核重点变化", hint: `${totalExceptions} 位员工含请假、调整或未达标`, storeId: nextIssue?.storeId }
          : readyStores.length
            ? { label: "去做门店月结", hint: `${readyStores.length} 家门店已经可以直接月结`, storeId: nextReady?.storeId }
            : { label: "查看已完成工资", hint: `${closedStores} 家门店已经月结`, storeId: storeSummaries[0]?.storeId };

  const priorityRows = storeSummaries
    .flatMap((item) => item.blockers.map((blocker) => ({
      storeId: item.storeId,
      storeName: item.storeName,
      employeeId: blocker.employeeId,
      employeeName: blocker.employeeName,
      reason: getPayrollIssueMessage(blocker.issues[0]),
    })));
  const priorityEmployees = priorityRows.slice(0, 3);

  function goToPayroll(storeId) {
    if (storeId) onSelectStore(storeId);
    onNavigate("payroll");
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* 顶部主指挥台 */}
      <Card
        style={{
          background: "linear-gradient(135deg, #001529 0%, #003a8c 100%)",
          color: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,21,41,0.15)",
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <Tag color="blue" style={{ marginBottom: 12 }}>本月指挥台 · {activeMonth}</Tag>
            <Title level={2} style={{ color: "#fff", marginTop: 0, marginBottom: 8 }}>
              {recommendedAction.label}
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginBottom: 20 }}>
              {recommendedAction.hint}。先清掉阻塞，再决定是否月结和导出。
            </Paragraph>
            <Space size="middle">
              <Button type="primary" size="large" onClick={() => goToPayroll(recommendedAction.storeId)}>
                {recommendedAction.label} <ArrowRightOutlined />
              </Button>
              <Button style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "transparent" }} size="large" onClick={() => onNavigate("reports")}>
                查看门店报表
              </Button>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              size="small"
              style={{ background: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.2)", borderRadius: 8 }}
              bodyStyle={{ padding: 16 }}
            >
              <Text strong style={{ color: "#fff", fontSize: 14 }}>结薪信心摘要</Text>
              <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: "rgba(255,255,255,0.7)" }}>待确认员工</span>}
                    value={totalPending}
                    suffix="人"
                    valueStyle={{ color: totalPending > 0 ? "#faad14" : "#52c41a", fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: "rgba(255,255,255,0.7)" }}>可直接月结</span>}
                    value={readyStores.length}
                    suffix="家"
                    valueStyle={{ color: readyStores.length > 0 ? "#52c41a" : "#fff", fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: "rgba(255,255,255,0.7)" }}>待复核变化</span>}
                    value={totalExceptions}
                    suffix="人"
                    valueStyle={{ color: totalExceptions > 0 ? "#fa147a" : "#fff", fontSize: 20 }}
                  />
                </Col>
              </Row>

              {/* 环比变动趋势卡片 */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>较上月 ({previousMonthStr}) 预估变动：</Text>
                <Tag color={momDiff > 0 ? "volcano" : momDiff < 0 ? "green" : "blue"} style={{ margin: 0 }}>
                  {momDiff >= 0 ? `+${formatCurrency(momDiff)} (+${momPercent}%)` : `-${formatCurrency(Math.abs(momDiff))} (${momPercent}%)`}
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 阻塞提示与关键数值指标 */}
      {totalBlockers > 0 ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`当前月结阻塞：${totalBlockers} 项`}
          description={
            <Space direction="vertical" style={{ width: "100%", marginTop: 4 }}>
              <Text type="secondary">待确认 {totalPending} · 待设置薪资 {totalUnconfigured} · 输入有误 {totalInvalid}</Text>
              {priorityEmployees.length > 0 && (
                <Space wrap style={{ marginTop: 4 }}>
                  {priorityEmployees.map((item) => (
                    <Button
                      key={`${item.storeId}-${item.employeeId}`}
                      size="small"
                      type="dashed"
                      danger
                      onClick={() => goToPayroll(item.storeId)}
                    >
                      {item.storeName} - {item.employeeName}: {item.reason}
                    </Button>
                  ))}
                </Space>
              )}
            </Space>
          }
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="当前没有月结阻塞，随时可以进入复核或直接月结。"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="预计实发" value={formatCurrency(totalForecast)} hint={`较上月 ${momDiff >= 0 ? "+" : "-"}${formatCurrency(Math.abs(momDiff))}`} accent="primary" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已确认实发" value={formatCurrency(totalConfirmed)} hint={`${totalPending} 人待确认`} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已月结实发" value={formatCurrency(totalClosed)} hint={`${closedStores}/${readiness.storeCount} 家门店完成`} accent={closedStores === readiness.storeCount ? "success" : "default"} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="月结阻塞" value={`${totalBlockers} 项`} hint={`待确认 ${totalPending} · 待设置 ${totalUnconfigured}`} accent={totalBlockers ? "warning" : "success"} />
        </Col>
      </Row>

      {/* 门店处理状态 */}
      <Card title={`${readiness.storeCount} 家门店处理状态`} style={{ borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          {storeSummaries.map((item) => {
            const maxTotal = Math.max(...storeSummaries.map((summary) => summary.totals.estimated), 1);
            const status = item.status === "closed"
              ? { label: "已月结", color: "success" }
              : item.status === "empty"
                ? { label: "暂无员工", color: "default" }
                : item.unconfiguredCount
                  ? { label: "待设置薪资", color: "warning" }
                  : item.invalidCount
                    ? { label: "有输入错误", color: "error" }
                    : item.pendingCount
                      ? { label: "待员工确认", color: "processing" }
                      : item.reviewCount
                        ? { label: "已确认待复核", color: "warning" }
                        : { label: "可直接月结", color: "success" };

            const percent = Math.round((item.totals.estimated / maxTotal) * 100);

            return (
              <Col xs={24} sm={12} lg={8} key={item.storeId}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => goToPayroll(item.storeId)}
                  style={{ borderRadius: 8 }}
                  title={
                    <Space>
                      <ShopOutlined />
                      <Text strong>{item.storeName}</Text>
                    </Space>
                  }
                  extra={<Tag color={status.color}>{status.label}</Tag>}
                >
                  <Statistic
                    title="实发金额 / 预计"
                    value={item.status === "closed" ? item.totals.closed : item.totals.confirmed}
                    prefix="￥"
                    suffix={<span style={{ fontSize: 12, color: "#8c8c8c" }}> / 预 ￥{item.totals.estimated}</span>}
                  />
                  <Progress percent={percent} size="small" status={item.status === "closed" ? "success" : "active"} style={{ margin: "8px 0" }} />
                  <Space split={<Text type="secondary">·</Text>} size="small" style={{ fontSize: 12 }}>
                    <span>已确认 {item.confirmedCount}</span>
                    <span>待确认 {item.pendingCount}</span>
                    <span>待复核 {item.reviewCount}</span>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </Space>
  );
}
