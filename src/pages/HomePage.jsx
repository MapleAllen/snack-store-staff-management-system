import { Card, Row, Col, Button, Tag, Alert, Space, Typography, List } from "antd";
import {
  CheckCircleOutlined,
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

export function HomePage({ workspace, activeMonth, onNavigate, onSelectStore, onSelectEmployee, openAdjustmentModal, onNavigateToEmployee }) {
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
    ? { label: "补充员工薪资设置", hint: `尚有 ${totalUnconfigured} 位员工需先完成薪资组件录入`, storeId: nextUnconfigured?.storeId, employeeId: nextUnconfigured?.blockers?.[0]?.employeeId, targetPage: "payroll", isSalaryPending: true }
    : totalInvalid
      ? { label: "修正考勤输入错误", hint: `存在 ${totalInvalid} 条异常考勤数据需优先更正`, storeId: nextInvalid?.storeId, employeeId: nextInvalid?.blockers?.[0]?.employeeId, targetPage: "attendance" }
      : totalPending
        ? { label: "完成员工考勤确认", hint: `仍有 ${totalPending} 位员工等待录入确认完成`, storeId: nextPending?.storeId, employeeId: nextPending?.blockers?.[0]?.employeeId, targetPage: "attendance" }
        : totalExceptions
          ? { label: "复核请假与调整变动", hint: `${totalExceptions} 位员工包含请假扣分或特殊调薪`, storeId: nextIssue?.storeId, employeeId: nextIssue?.reviews?.[0]?.employeeId ?? nextIssue?.blockers?.[0]?.employeeId, targetPage: "payroll" }
          : readyStores.length
            ? { label: "执行门店月结封账", hint: `${readyStores.length} 家门店数据核对无误，可直接封账`, storeId: nextReady?.storeId, targetPage: "payroll" }
            : { label: "查看月结工资报表", hint: `全店 ${closedStores} 家门店已完成本月月结`, storeId: storeSummaries[0]?.storeId, targetPage: "reports" };

  const priorityGroups = storeSummaries
    .filter((item) => item.blockers.length > 0)
    .map((item) => ({
      ...item,
      blockerRows: item.blockers.map((blocker) => {
        const firstIssue = blocker.issues[0];
        const isSalaryPending = firstIssue?.code === "PAYROLL_EMPLOYEE_SALARY_PENDING" || firstIssue?.code === "CLOSE_EMPLOYEE_SALARY_PENDING";
        const isAttendanceError = firstIssue?.code?.includes("LEAVE") || firstIssue?.code?.includes("ATTENDANCE");
        const isUnconfirmed = firstIssue?.field === "entry.isComplete";
        return {
          employeeId: blocker.employeeId,
          employeeName: blocker.employeeName,
          reason: getPayrollIssueMessage(firstIssue),
          isSalaryPending,
          targetPage: isAttendanceError || isUnconfirmed ? "attendance" : "payroll",
        };
      }),
    }));

  function handleGoTo(storeId, employeeId, targetPage = "payroll", isSalaryPending = false) {
    if (onNavigateToEmployee) {
      onNavigateToEmployee(storeId, employeeId, targetPage, isSalaryPending ? "openAdjustment" : null);
    } else {
      if (storeId) onSelectStore(storeId);
      if (employeeId && onSelectEmployee) onSelectEmployee(employeeId);
      onNavigate(targetPage);
      if (isSalaryPending && openAdjustmentModal && employeeId) {
        openAdjustmentModal(employeeId);
      }
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* 顶部主指挥台 - 单一主角突出总额 */}
      <Card className="hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={13}>
            <Tag color="orange" style={{ marginBottom: 12, fontSize: 13, padding: "2px 10px" }}>
              工资管理指挥台 · {activeMonth}
            </Tag>
            <div className="hero-card__label">
              本月预计实发总额
            </div>
            <div className="hero-card__amount">
              <span className="tabular-nums hero-card__amount-value">
                {formatCurrency(totalForecast).replace("￥", "")}
              </span>
              <span className="hero-card__unit">元</span>
              {momDiff === 0 ? (
                <Tag>与上月持平</Tag>
              ) : (
                <Tag color={momDiff > 0 ? "volcano" : "green"}>
                  {momDiff > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {` 较上月 ${momDiff > 0 ? "+" : "-"}${formatCurrency(Math.abs(momDiff))}`}
                  {prevForecast ? ` (${momDiff > 0 ? "+" : ""}${momPercent}%)` : ""}
                </Tag>
              )}
            </div>
            <Paragraph className="hero-card__hint">
              {recommendedAction.hint}
            </Paragraph>
            <Button
              type="primary"
              size="large"
              style={{
                height: 44,
                fontSize: 16,
                fontWeight: 600,
                padding: "0 28px",
              }}
              onClick={() => handleGoTo(recommendedAction.storeId, recommendedAction.employeeId, recommendedAction.targetPage, recommendedAction.isSalaryPending)}
            >
              下一步：{recommendedAction.label} <ArrowRightOutlined />
            </Button>
          </Col>

          <Col xs={24} lg={11}>
            <Card size="small" title={<Text strong style={{ fontSize: 15 }}>月结进度与监控摘要</Text>}>
              <Row gutter={[12, 16]}>
                <Col span={8}>
                  <div className="hero-stat__label">待确认员工</div>
                  <div className={`hero-stat__value ${totalPending > 0 ? "hero-stat__value--warning" : "hero-stat__value--success"}`}>
                    {totalPending} <span className="hero-stat__unit">人</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="hero-stat__label">可直接月结</div>
                  <div className={`hero-stat__value ${readyStores.length > 0 ? "hero-stat__value--success" : ""}`}>
                    {readyStores.length} <span className="hero-stat__unit">家</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="hero-stat__label">阻塞问题项</div>
                  <div className={`hero-stat__value ${totalBlockers > 0 ? "hero-stat__value--danger" : "hero-stat__value--success"}`}>
                    {totalBlockers} <span className="hero-stat__unit">项</span>
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
            dataSource={priorityGroups}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="handle"
                    type="primary"
                    danger
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      const first = item.blockerRows[0];
                      handleGoTo(item.storeId, first?.employeeId, first?.targetPage, first?.isSalaryPending);
                    }}
                  >
                    去处理
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<ShopOutlined style={{ fontSize: 18, color: "var(--brand)" }} />}
                  title={<Text strong>{item.storeName} · {item.blockerCount} 位员工待处理</Text>}
                  description={
                    <Space direction="vertical" size={2}>
                      {item.blockerRows.slice(0, 3).map((row) => (
                        <Text type="secondary" key={row.employeeId}>{row.employeeName}：{row.reason}</Text>
                      ))}
                      {item.blockerRows.length > 3 ? <Text type="secondary">另有 {item.blockerRows.length - 3} 位员工</Text> : null}
                    </Space>
                  }
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
            value={momDiff === 0 ? "持平" : `${momDiff > 0 ? "+" : ""}${momPercent}%`}
            hint={momDiff === 0 ? `上月 ${formatCurrency(prevForecast)}` : `金额 ${momDiff >= 0 ? "+" : "-"}${formatCurrency(Math.abs(momDiff))} (上月 ${formatCurrency(prevForecast)})`}
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
                  onClick={() => handleGoTo(item.storeId, null, "payroll")}
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
                      <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>
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
