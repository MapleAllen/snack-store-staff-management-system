import { useState } from "react";
import { Card, Table, InputNumber, Button, Tag, Row, Col, Alert, Space, Tooltip, Typography, Switch, Dropdown, Modal, Select, Grid, Steps } from "antd";
import {
  CheckCircleOutlined,
  ArrowRightOutlined,
  LockOutlined,
  ClearOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { getPayrollIssueMessage } from "../payrollLogic.js";
import { ATTENDANCE_REASONS } from "../payrollData.js";

const { Text } = Typography;

export function AttendancePage({ store, activeMonth, rows, patchEntry, toggleComplete, isLocked, onNavigate }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [batchModal, setBatchModal] = useState(null);

  const totalOvertime = rows.reduce((sum, row) => sum + row.breakdown.overtimeHours, 0);
  const totalLeaveDays = rows.reduce((sum, row) => sum + row.breakdown.leaveDays, 0);
  const unconfirmedCount = rows.filter((row) => !row.entry.isComplete).length;

  function handleBatchAuditPass() {
    rows.forEach((row) => {
      patchEntry(row.employee.id, { auditPassed: true });
    });
    setBatchModal(null);
  }

  function handleBatchClearLeave() {
    rows.forEach((row) => {
      patchEntry(row.employee.id, { leaveDays: 0, leaveHours: 0 });
    });
    setBatchModal(null);
  }

  const columns = [
    {
      title: "姓名",
      dataIndex: ["employee", "name"],
      key: "name",
      width: 130,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>工号: {record.employee.employeeNumber || record.employee.id.slice(-8)}</Text>
        </Space>
      ),
    },
    {
      title: "加班时长 (小时)",
      key: "overtimeHours",
      width: 140,
      render: (_, record) => (
        <InputNumber
          disabled={isLocked}
          min={0}
          step={0.5}
          value={record.entry.overtimeHours}
          onChange={(val) => patchEntry(record.employee.id, { overtimeHours: val ?? 0 })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "请假天数",
      key: "leaveDays",
      width: 120,
      render: (_, record) => {
        const val = record.entry.leaveDays;
        const isExcess = val > 31;
        return (
          <Tooltip title={isExcess ? "提示：请假天数大于 31 天，请确认是否误输入" : ""}>
            <InputNumber
              disabled={isLocked}
              min={0}
              step={0.5}
              status={isExcess ? "warning" : ""}
              value={val}
              onChange={(v) => patchEntry(record.employee.id, { leaveDays: v ?? 0 })}
              style={{ width: "100%" }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "请假小时",
      key: "leaveHours",
      width: 120,
      render: (_, record) => {
        const val = record.entry.leaveHours;
        const isExcess = val > 200;
        return (
          <Tooltip title={isExcess ? "提示：请假小时较大，建议换算为请假天数" : ""}>
            <InputNumber
              disabled={isLocked}
              min={0}
              step={0.5}
              status={isExcess ? "warning" : ""}
              value={val}
              onChange={(v) => patchEntry(record.employee.id, { leaveHours: v ?? 0 })}
              style={{ width: "100%" }}
            />
          </Tooltip>
        );
      },
    },
    ...(store.config.nightShiftRate > 0
      ? [
          {
            title: "夜班时长",
            key: "nightShiftHours",
            width: 120,
            render: (_, record) => (
              <InputNumber
                disabled={isLocked}
                min={0}
                step={0.5}
                value={record.entry.nightShiftHours}
                onChange={(val) => patchEntry(record.employee.id, { nightShiftHours: val ?? 0 })}
                style={{ width: "100%" }}
              />
            ),
          },
        ]
      : []),
    {
      title: "全勤/稽核达标",
      key: "auditPassed",
      width: 140,
      render: (_, record) => (
        <Switch
          disabled={isLocked}
          checked={record.entry.auditPassed}
          checkedChildren="全勤达标"
          unCheckedChildren="未达标"
          onChange={(checked) => patchEntry(record.employee.id, { auditPassed: checked })}
        />
      ),
    },
    {
      title: "考勤业务原因",
      key: "attendanceReason",
      render: (_, record) => (
        <Select
          disabled={isLocked}
          allowClear
          value={record.entry.attendanceReason || undefined}
          placeholder="选择标准原因"
          options={ATTENDANCE_REASONS.map((reason) => ({ value: reason, label: reason }))}
          onChange={(attendanceReason) => patchEntry(record.employee.id, { attendanceReason: attendanceReason ?? "" })}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "录入确认",
      key: "isComplete",
      width: 160,
      align: "right",
      render: (_, record) => {
        const disabled = isLocked || (!record.entry.isComplete && record.validationIssues.length > 0);
        const issueMsg = getPayrollIssueMessage(record.validationIssues[0]);
        const completedTimeStr = record.entry.completedAt
          ? new Date(record.entry.completedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
          : "";

        const btn = record.entry.isComplete ? (
          <Button
            type="primary"
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            disabled={isLocked}
            icon={<CheckCircleOutlined />}
            onClick={() => toggleComplete(record.employee.id, false)}
          >
            已确认 {completedTimeStr}
          </Button>
        ) : (
          <Button
            type="default"
            danger={record.validationIssues.length > 0}
            disabled={disabled}
            onClick={() => toggleComplete(record.employee.id, true)}
          >
            {record.validationIssues.length ? "无法确认 (有错误)" : "点此确认完成"}
          </Button>
        );

        return record.validationIssues.length && !record.entry.isComplete ? (
          <Tooltip title={issueMsg}>{btn}</Tooltip>
        ) : (
          btn
        );
      },
    },
  ];

  const batchMenuItems = [
    {
      key: "auditPass",
      label: "一键全员稽核达标",
      icon: <CheckCircleOutlined />,
      onClick: () => setBatchModal("auditPass"),
    },
    {
      key: "clearLeave",
      label: "清空所有请假记录",
      icon: <ClearOutlined />,
      danger: true,
      onClick: () => setBatchModal("clearLeave"),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="考勤管理"
        title={`${store.name} 考勤管理`}
        description={`${activeMonth} 考勤录入实时参与薪酬计算。${isLocked ? " 本月已月结封账，处于只读模式。" : ""}`}
        actions={
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => onNavigate("payroll")}>
            去工资台确认核对
          </Button>
        }
      />

      <Card size="small" className="workflow-steps">
        <Steps
          size="small"
          current={unconfirmedCount > 0 ? 0 : 1}
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

      {/* 月结封账警告 */}
      {isLocked && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          message="当前月份已月结封账"
          description="如需修改考勤数据，请先在“工资管理”页面中提交解锁原因并解锁。"
        />
      )}

      {/* 待确认员工提示 Banner */}
      {!isLocked && unconfirmedCount > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={`尚有 ${unconfirmedCount} 位员工的考勤未确认完成`}
          description="录入完加班、请假与稽核达标状态后，请在表格最右侧点击“点此确认完成”。"
          action={
            <Button size="small" type="primary" onClick={() => onNavigate("payroll")}>
              去工资台核对
            </Button>
          }
        />
      )}

      {/* 2 张核心指标卡 (代替原来的 4 张平权卡) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <StatCard label="本月累计加班" value={`${totalOvertime} 小时`} hint="按员工个人加班时薪独立计入应发工资" accent="primary" />
        </Col>
        <Col xs={24} sm={12}>
          <StatCard label="本月累计请假" value={`${totalLeaveDays} 天`} hint="按门店算薪规则天数/小时除数扣减基础工资" accent="warning" />
        </Col>
      </Row>

      {/* 考勤明细表格 */}
      <Card
        title="本月考勤录入明细"
        extra={
          !isLocked && (
            <Dropdown menu={{ items: batchMenuItems }} placement="bottomRight">
              <Button size="middle">
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          )
        }
        style={{ borderRadius: 8 }}
      >
        {isMobile ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {rows.map((row) => {
              const confirmationDisabled = isLocked || (!row.entry.isComplete && row.validationIssues.length > 0);
              return (
                <div className={`mobile-record-card mobile-record-card--flat ${row.entry.isComplete ? "mobile-record-card--confirmed" : ""}`} key={row.employee.id}>
                  <div className="mobile-record-heading">
                    <div><Text strong>{row.employee.name}</Text><Text type="secondary">{row.employee.employeeNumber ? `工号 ${row.employee.employeeNumber}` : `编号 ${row.employee.id.slice(-8)}`}</Text></div>
                    <Tag color={row.entry.isComplete ? "success" : "warning"}>{row.entry.isComplete ? "已确认" : "待确认"}</Tag>
                  </div>
                  <div className="mobile-input-grid">
                    <label><span>加班小时</span><InputNumber disabled={isLocked} min={0} step={0.5} value={row.entry.overtimeHours} onChange={(value) => patchEntry(row.employee.id, { overtimeHours: value ?? 0 })} /></label>
                    <label><span>请假天数</span><InputNumber disabled={isLocked} min={0} step={0.5} value={row.entry.leaveDays} onChange={(value) => patchEntry(row.employee.id, { leaveDays: value ?? 0 })} /></label>
                    <label><span>请假小时</span><InputNumber disabled={isLocked} min={0} step={0.5} value={row.entry.leaveHours} onChange={(value) => patchEntry(row.employee.id, { leaveHours: value ?? 0 })} /></label>
                    {store.config.nightShiftRate > 0 ? <label><span>夜班小时</span><InputNumber disabled={isLocked} min={0} step={0.5} value={row.entry.nightShiftHours} onChange={(value) => patchEntry(row.employee.id, { nightShiftHours: value ?? 0 })} /></label> : null}
                  </div>
                  <div className="mobile-record-control"><Text type="secondary">全勤/稽核</Text><Switch disabled={isLocked} checked={row.entry.auditPassed} checkedChildren="达标" unCheckedChildren="未达标" onChange={(checked) => patchEntry(row.employee.id, { auditPassed: checked })} /></div>
                  <Select disabled={isLocked} allowClear value={row.entry.attendanceReason || undefined} placeholder="选择考勤业务原因" options={ATTENDANCE_REASONS.map((reason) => ({ value: reason, label: reason }))} onChange={(attendanceReason) => patchEntry(row.employee.id, { attendanceReason: attendanceReason ?? "" })} style={{ width: "100%" }} />
                  <Button
                    block
                    type={row.entry.isComplete ? "primary" : "default"}
                    disabled={confirmationDisabled}
                    danger={!row.entry.isComplete && row.validationIssues.length > 0}
                    icon={row.entry.isComplete ? <CheckCircleOutlined /> : null}
                    onClick={() => toggleComplete(row.employee.id, !row.entry.isComplete)}
                  >
                    {row.entry.isComplete ? "已确认，点击重新编辑" : row.validationIssues.length ? getPayrollIssueMessage(row.validationIssues[0]) : "确认该员工本月考勤"}
                  </Button>
                </div>
              );
            })}
          </Space>
        ) : (
          <Table
            columns={columns}
            dataSource={rows}
            rowKey={(row) => row.employee.id}
            rowClassName={(row) => (row.entry.isComplete ? "row-status-confirmed" : "row-status-pending")}
            pagination={false}
            size="middle"
            scroll={{ x: 960 }}
          />
        )}
      </Card>

      {/* 批量操作确认 Modal */}
      {batchModal && (
        <Modal
          title={batchModal === "auditPass" ? "确认一键全员稽核达标" : "确认清空所有请假记录"}
          open={Boolean(batchModal)}
          onCancel={() => setBatchModal(null)}
          onOk={batchModal === "auditPass" ? handleBatchAuditPass : handleBatchClearLeave}
          okText="确认执行"
          cancelText="取消"
        >
          <p>
            {batchModal === "auditPass"
              ? `即将为 ${store.name} 本月全部 ${rows.length} 位员工标记为“全勤/稽核达标”，确定继续吗？`
              : `即将清空 ${store.name} 本月所有员工的请假天数与请假小时，此操作不可撤销，确定继续吗？`}
          </p>
        </Modal>
      )}
    </Space>
  );
}
