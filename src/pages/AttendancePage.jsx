import { Card, Table, InputNumber, Input, Button, Tag, Row, Col, Alert, Space, Tooltip, Typography, Switch, Popconfirm } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  LockOutlined,
  ClearOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { getPayrollIssueMessage } from "../payrollLogic.js";

const { Text } = Typography;

export function AttendancePage({ store, activeMonth, rows, patchEntry, toggleComplete, isLocked, onNavigate }) {
  const totalOvertime = rows.reduce((sum, row) => sum + row.breakdown.overtimeHours, 0);
  const totalLeaveDays = rows.reduce((sum, row) => sum + row.breakdown.leaveDays, 0);
  const qualified = rows.filter((row) => row.entry.auditPassed).length;

  function handleBatchAuditPass() {
    rows.forEach((row) => {
      patchEntry(row.employee.id, { auditPassed: true });
    });
  }

  function handleBatchClearLeave() {
    rows.forEach((row) => {
      patchEntry(row.employee.id, { leaveDays: 0, leaveHours: 0 });
    });
  }

  const columns = [
    {
      title: "姓名",
      dataIndex: ["employee", "name"],
      key: "name",
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
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
      title: "稽核状态",
      key: "auditPassed",
      width: 120,
      render: (_, record) => (
        <Switch
          disabled={isLocked}
          checked={record.entry.auditPassed}
          checkedChildren="达标"
          unCheckedChildren="未达标"
          onChange={(checked) => patchEntry(record.employee.id, { auditPassed: checked })}
        />
      ),
    },
    {
      title: "考勤备注",
      key: "note",
      render: (_, record) => (
        <Input
          disabled={isLocked}
          value={record.entry.note}
          placeholder="考勤备注"
          onChange={(e) => patchEntry(record.employee.id, { note: e.target.value })}
        />
      ),
    },
    {
      title: "录入确认",
      key: "isComplete",
      width: 150,
      render: (_, record) => {
        const disabled = isLocked || (!record.entry.isComplete && record.validationIssues.length > 0);
        const issueMsg = getPayrollIssueMessage(record.validationIssues[0]);

        const btn = (
          <Button
            type={record.entry.isComplete ? "primary" : "default"}
            disabled={disabled}
            icon={record.entry.isComplete ? <CheckCircleOutlined /> : undefined}
            onClick={() => toggleComplete(record.employee.id, !record.entry.isComplete)}
          >
            {record.entry.isComplete
              ? "已确认完成"
              : record.validationIssues.length
              ? "先修正再确认"
              : "确认完成"}
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

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="考勤管理"
        title={`${store.name} 考勤管理`}
        description={`${activeMonth} 考勤录入实时参与薪酬计算。${isLocked ? " 本月已月结封账，为只读模式。" : ""}`}
        actions={
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => onNavigate("payroll")}>
            去核对工资
          </Button>
        }
      />

      {isLocked && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          message="当前月份已月结封账"
          description="如需修改考勤数据，请先在“工资管理”中提交解锁原因。"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="累计加班" value={`${totalOvertime} 小时`} hint="按员工加班时薪计入工资" accent="primary" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="累计请假" value={`${totalLeaveDays} 天`} hint="另含按小时请假扣减" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="稽核达标" value={`${qualified} 人`} hint={`共 ${rows.length} 位员工`} accent="success" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard label="夜班规则" value={store.config.nightShiftRate ? `${store.config.nightShiftRate} 元/时` : "未启用"} hint="按门店规则计算" />
        </Col>
      </Row>

      <Card
        title="本月考勤录入明细"
        extra={
          !isLocked && (
            <Space wrap>
              <Button size="small" icon={<CheckCircleOutlined />} onClick={handleBatchAuditPass}>
                一键全员稽核达标
              </Button>
              <Popconfirm title="确定清空所有员工的请假记录？" onConfirm={handleBatchClearLeave}>
                <Button size="small" icon={<ClearOutlined />}>
                  清空请假记录
                </Button>
              </Popconfirm>
            </Space>
          )
        }
        style={{ borderRadius: 8 }}
      >
        <Table
          columns={columns}
          dataSource={rows}
          rowKey={(row) => row.employee.id}
          pagination={false}
          size="middle"
        />
      </Card>
    </Space>
  );
}
