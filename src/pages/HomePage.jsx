import { Card, Row, Col, Button, Tag, Alert, Space, Typography, List } from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { StatCard } from "../components/StatCard.jsx";
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
    ? { label: "补充员工薪资设置", hint: `尚有 ${totalUnconfigured} 位员工需先完成薪资组件录入`, storeId: nextUnconfigured?.storeId }
    : totalInvalid
      ? { label: "修正考勤输入错误", hint: `存在 ${totalInvalid} 条异常考勤数据需优先更正`, storeId: nextInvalid?.storeId }
      : totalPending
        ? { label: "确认员工考勤发薪明细", hint: `仍有 ${totalPending} 位员工等待录入确认完成`, storeId: nextPending?.storeId }
        : totalExceptions
          ? { label: "复核请假与调整变动", hint: `${totalExceptions} 位员工包含请假扣分或特殊调薪`, storeId: nextIssue?.storeId }
          : readyStores.length
            ? { label: "执行门店月结封账", hint: `${readyStores.length} 家门店数据核对无误，可直接封账`, storeId: nextReady?.storeId }
            : { label: "查看月结工资报表", hint: `全店 ${closedStores} 家门店已完成本月月结`, storeId: storeSummaries[0]?.storeId };

  const priorityRows = storeSummaries
    .flatMap((item) => item.blockers.map((blocker) => ({
      storeId: item.storeId,
      storeName: item.storeName,
      employeeId: blocker.employeeId,
      employeeName: blocker.employeeName,
      reason: getPayrollIssueMessage(blocker.issues[0]),
    })));

  function goToPayroll(storeId) {
    if (storeId) onSelectStore(storeId);
    onNavigate("payroll");
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* 顶部主指挥台 - 单一主角突出总额 */}
      <Card
        style={{
          background: "linear-gradient(135deg, #001529 0%, #003a8c 100%)",
          color: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,21,41,0.15)",
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={13}>
            <Tag color="blue" style={{ marginBottom: 12, fontSize: 13, padding: "2px 10px" }}>
              经营指挥台 · {activeMonth}
            </Tag>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 4 }}>
              本月预计实发总额
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
              <span className="tabular-nums" style={{ fontSize: 40, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                {formatCurrency(totalForecast).replace("￥", "")}
              </span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.85)" }}>元</span>
              <Tag
                color={momDiff > 0 ? "volcano" : momDiff < 0 ? "green" : "blue"}
                style={{ fontSize: 13, padding: "2px 8px", borderRadius: 4 }}
              >
                {momDiff >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {momDiff >= 0 ? ` 较上月 +${formatCurrency(momDiff)} (+${momPercent}%)` : ` 较上月 -${formatCurrency(Math.abs(momDiff))} (${momPercent}%)`}
              </Tag>
            </div>
            <Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 20 }}>
              {recommendedAction.hint}
            </Paragraph>
            <Button
              type="primary"
              size="large"
              style={{
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
                height: 44,
                fontSize: 16,
                fontWeight: 600,
                padding: "0 28px",
                borderRadius: 8,
              }}
              onClick={() => goToPayroll(recommendedAction.storeId)}
            >
              下一步：{recommendedAction.label} <ArrowRightOutlined />
            </Button>
          </Col>

          <Col xs={24} lg={11}>
            <Card
              size="small"
              style={{ background: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.18)", borderRadius: 8 }}
              bodyStyle={{ padding: 20 }}
            >
              <Text strong style={{ color: "#fff", fontSize: 15, display: "block", marginBottom: 16 }}>
                月结进度与监控摘要
              </Text>
              <Row gutter={[12, 16]}>
                <Col span={8}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>待确认员工</div>
                  <div style={{ color: totalPending > 0 ? "#faad14" : "#52c41a", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                    {totalPending} <span style={{ fontSize: 13, fontWeight: 400 }}>人</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>可直接月结</div>
                  <div style={{ color: readyStores.length > 0 ? "#52c41a" : "#fff", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                    {readyStores.length} <span style={{ fontSize: 13, fontWeight: 400 }}>家</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>阻塞问题项</div>
                  <div style={{ color: totalBlockers > 0 ? "#ff4d4f" : "#52c41a", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                    {totalBlockers} <span style={{ fontSize: 13, fontWeight: 400 }}>项</span>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 阻塞待办清单 / 正常通行提示 */}
      {totalBlockers > 0 ? (
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />
              <Text strong style={{ color: "#ff4d4f" }}>
                阻塞处理待办清单 (共 {totalBlockers} 项需处理)
              </Text>
            </Space>
          }
          style={{ borderRadius: 8, borderColor: "#ffccc7" }}
          bodyStyle={{ padding: "12px 24px" }}
        >
          <List
            size="small"
            dataSource={priorityRows}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="handle"
                    type="primary"
                    danger
                    size="small"
                    onClick={() => goToPayroll(item.storeId)}
                  >
                    去处理
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<ShopOutlined style={{ fontSize: 18, color: "#1677ff" }} />}
                  title={<Text strong>{item.storeName} · {item.employeeName}</Text>}
                  description={<Text type="danger">{item.reason}</Text>}
                />
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="所有门店考勤与薪资无阻塞项，可随时进行复核或直接月结封账。"
        />
      )}

      {/* 4 张核心指标卡 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="较上月变动"
            value={`${momDiff >= 0 ? "+" : ""}${momPercent}%`}
            hint={`金额 ${momDiff >= 0 ? "+" : "-"}${formatCurrency(Math.abs(momDiff))} (上月 ${formatCurrency(prevForecast)})`}
            accent={momDiff > 0 ? "danger" : momDiff < 0 ? "success" : "default"}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已确认实发" value={formatCurrency(totalConfirmed)} hint={`${totalPending} 人待确认完成`} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="已月结封账实发" value={formatCurrency(totalClosed)} hint={`${closedStores}/${readiness.storeCount} 家门店已封账`} accent={closedStores === readiness.storeCount ? "success" : "default"} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="月结阻塞项" value={`${totalBlockers} 项`} hint={`待确认 ${totalPending} · 待设薪资 ${totalUnconfigured}`} accent={totalBlockers ? "warning" : "success"} />
        </Col>
      </Row>

      {/* 门店卡片列表 - 整卡可点，清晰展示完成度与金额 */}
      <Card title={`${readiness.storeCount} 家门店处理状态`} style={{ borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          {storeSummaries.map((item) => {
            const status = item.status === "closed"
              ? { label: "已月结封账", color: "success" }
              : item.status === "empty"
                ? { label: "暂无员工", color: "default" }
                : item.unconfiguredCount
                  ? { label: "待设置薪资", color: "warning" }
                  : item.invalidCount
                    ? { label: "有输入错误", color: "error" }
                    : item.pendingCount
                      ? { label: "待员工确认", color: "warning" }
                      : item.reviewCount
                        ? { label: "已确认待复核", color: "warning" }
                        : { label: "可直接月结", color: "success" };

            return (
              <Col xs={24} sm={12} lg={8} key={item.storeId}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => goToPayroll(item.storeId)}
                  style={{ borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
                  title={
                    <Space>
                      <ShopOutlined />
                      <Text strong>{item.storeName}</Text>
                    </Space>
                  }
                  extra={<Tag color={status.color}>{status.label}</Tag>}
                >
                  <div style={{ margin: "12px 0" }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>本月确认实发金额 / 预计</Text>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                      <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: "#1677ff" }}>
                        {formatCurrency(item.status === "closed" ? item.totals.closed : item.totals.confirmed)}
                      </span>
                      <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                        / 预 {formatCurrency(item.totals.estimated)}
                      </span>
                    </div>
                  </div>

                  <div style={{ paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <Text type="secondary">核对完成度</Text>
                    <Text strong style={{ color: item.confirmedCount === item.employeeCount ? "#52c41a" : "#faad14" }}>
                      {item.confirmedCount} / {item.employeeCount} 人已确认
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </Space>
  );
}
