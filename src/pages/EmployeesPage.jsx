import { useState } from "react";
import { Card, Table, Tag, Button, Space, Input, Row, Col, Typography, Avatar, Popconfirm, Drawer, Descriptions, Segmented, Timeline, Grid } from "antd";
import {
  PlusOutlined,
  SwapOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { formatCurrency, getAssignmentAtMonth, getEmployeeAssignments, getEmployeesWithStoreHistory } from "../payrollLogic.js";

const { Text, Title, Paragraph } = Typography;

export function EmployeesPage({ workspace, store, currentMonth, onCreate, onToggleResignation, onTransfer }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyDrawerEmployee, setHistoryDrawerEmployee] = useState(null);

  const employees = getEmployeesWithStoreHistory(workspace, store.id);
  const storeMap = new Map(workspace.stores.map((item) => [item.id, item]));

  const cards = employees.map((employee) => {
    const assignments = getEmployeeAssignments(workspace, employee.id);
    const currentAssignment = getAssignmentAtMonth(workspace, employee.id, currentMonth);
    const futureAssignment = assignments.find((assignment) => assignment.startMonth > currentMonth);
    const storeHistory = assignments.filter((assignment) => assignment.storeId === store.id);
    const currentHere = currentAssignment?.storeId === store.id;
    const plannedOut = currentHere && futureAssignment?.storeId !== store.id ? futureAssignment : null;
    const plannedIn = !currentHere && futureAssignment?.storeId === store.id ? futureAssignment : null;
    return { employee, currentAssignment, storeHistory, currentHere, plannedOut, plannedIn };
  }).sort((a, b) => Number(b.currentHere) - Number(a.currentHere));

  // 统计指标数据
  const activeCount = cards.filter((c) => c.currentHere && !c.employee.isResigned).length;
  const pendingSalaryCount = cards.filter((c) => c.currentHere && !c.employee.isResigned && !c.employee.salaryConfigured).length;
  const historyCount = cards.filter((c) => c.employee.isResigned || !c.currentHere).length;

  const visibleCards = cards.filter(({ employee, currentHere }) => {
    if (searchTerm.trim() && !employee.name.includes(searchTerm.trim()) && !employee.id.includes(searchTerm.trim())) {
      return false;
    }
    if (statusFilter === "active") return currentHere && !employee.isResigned;
    if (statusFilter === "pending") return currentHere && !employee.isResigned && !employee.salaryConfigured;
    if (statusFilter === "history") return employee.isResigned || !currentHere;
    return true;
  });

  const columns = [
    {
      title: "成员代号",
      dataIndex: ["employee", "name"],
      key: "name",
      render: (_, record) => (
        <Space
          style={{ cursor: "pointer" }}
          onClick={() => setHistoryDrawerEmployee(record.employee)}
        >
          <Avatar style={{ backgroundColor: record.employee.isResigned ? "#d9d9d9" : "#1677ff" }}>
            {record.employee.name.slice(-1)}
          </Avatar>
          <div>
            <Text strong>{record.employee.name}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>系统编号：{record.employee.id.slice(-8)}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "状态归属",
      key: "status",
      render: (_, record) => {
        const { employee, currentHere, plannedOut, plannedIn, currentAssignment } = record;
        if (employee.isResigned) {
          return <Tag color="error">已离职 ({employee.resignationDate})</Tag>;
        }
        if (!employee.salaryConfigured) {
          return <Tag color="warning">薪资待设置</Tag>;
        }
        if (currentHere) {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="success">当前在本店在岗</Tag>
              {plannedOut && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  将于 {plannedOut.startMonth} 调往 {storeMap.get(plannedOut.storeId)?.name}
                </Text>
              )}
            </Space>
          );
        }
        return (
          <Space direction="vertical" size={2}>
            <Tag color="default">历史成员</Tag>
            {plannedIn && (
              <Text type="success" style={{ fontSize: 12 }}>
                将于 {plannedIn.startMonth} 调入本店
              </Text>
            )}
            {!currentHere && currentAssignment && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前归属：{storeMap.get(currentAssignment.storeId)?.name}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "基础工资",
      dataIndex: ["employee", "baseSalary"],
      key: "baseSalary",
      render: (val, record) => record.employee.salaryConfigured ? (
        <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatCurrency(val)}</span>
      ) : (
        <Text type="warning">待设置薪资</Text>
      ),
    },
    {
      title: "全勤奖金",
      dataIndex: ["employee", "attendanceBonus"],
      key: "attendanceBonus",
      render: (val, record) => record.employee.salaryConfigured ? formatCurrency(val) : "-",
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => {
        const { employee, currentHere } = record;
        return (
          <Space wrap size="small">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryDrawerEmployee(employee)}>
              代号与履历
            </Button>
            {currentHere && !employee.isResigned && (
              <Button size="small" icon={<SwapOutlined />} onClick={() => onTransfer(employee)}>
                调店
              </Button>
            )}
            {currentHere && (
              <Popconfirm
                title={employee.isResigned ? "确定恢复该员工在职？" : "确定办理该员工离职？"}
                description={
                  employee.isResigned
                    ? "恢复在职后，该员工将重新回到当前门店考勤与发薪名单中。"
                    : "办理离职后，该员工仍保留在历史月份的工资单中，月结计算将按照离职日前在职时间结算。"
                }
                onConfirm={() => onToggleResignation(employee, !employee.isResigned)}
                okText={employee.isResigned ? "确认恢复" : "确认离职"}
                okButtonProps={{ danger: !employee.isResigned }}
                cancelText="取消"
              >
                <Button
                  size="small"
                  danger={!employee.isResigned}
                  icon={employee.isResigned ? <UserAddOutlined /> : <UserDeleteOutlined />}
                >
                  {employee.isResigned ? "恢复在职" : "办理离职"}
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const drawerAssignments = historyDrawerEmployee ? getEmployeeAssignments(workspace, historyDrawerEmployee.id) : [];
  const drawerAdjustments = historyDrawerEmployee ? workspace.adjustments.filter((a) => a.employeeId === historyDrawerEmployee.id) : [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="成员与工资"
        title={`${store.name} 岗位成员`}
        description="使用系统生成的匿名成员代号管理工资、调店和在职状态；本页不保存姓名或联系方式。"
        actions={
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onCreate}>
            新增岗位成员
          </Button>
        }
      />

      {/* 页顶分段统计与过滤器 - 替代简单下拉框 */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md="auto" style={{ overflowX: "auto" }}>
            <Segmented
              size="large"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: `全部成员 (${cards.length})`, value: "all" },
                { label: `在岗成员 (${activeCount})`, value: "active" },
                { label: `待设薪资 (${pendingSalaryCount})`, value: "pending" },
                { label: `历史与离岗 (${historyCount})`, value: "history" },
              ]}
            />
          </Col>
          <Col xs={24} md="auto">
            <Input
              placeholder="搜索成员代号或系统编号"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: isMobile ? "100%" : 220 }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* 桌面保留高密度表格，移动端切换为可触控员工卡片。 */}
      {isMobile ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {visibleCards.map(({ employee, currentHere, plannedOut, plannedIn, currentAssignment }) => (
            <Card
              key={employee.id}
              size="small"
              className="mobile-record-card"
              title={<Space><Avatar size="small">{employee.name.slice(-1)}</Avatar><Text strong>{employee.name}</Text></Space>}
              extra={employee.isResigned ? <Tag color="error">已离职</Tag> : !employee.salaryConfigured ? <Tag color="warning">待设薪资</Tag> : <Tag color={currentHere ? "success" : "default"}>{currentHere ? "本店在岗" : "历史成员"}</Tag>}
            >
              <div className="mobile-record-grid">
                <div><Text type="secondary">基础工资</Text><strong>{employee.salaryConfigured ? formatCurrency(employee.baseSalary) : "待设置"}</strong></div>
                <div><Text type="secondary">全勤奖金</Text><strong>{employee.salaryConfigured ? formatCurrency(employee.attendanceBonus) : "—"}</strong></div>
              </div>
              {plannedOut ? <Text type="warning">{plannedOut.startMonth} 调往 {storeMap.get(plannedOut.storeId)?.name}</Text> : null}
              {plannedIn ? <Text type="success">{plannedIn.startMonth} 调入本店</Text> : null}
              {!currentHere && currentAssignment ? <Text type="secondary">当前归属：{storeMap.get(currentAssignment.storeId)?.name}</Text> : null}
              <div className="mobile-record-actions">
                <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryDrawerEmployee(employee)}>查看履历</Button>
                {currentHere && !employee.isResigned ? <Button size="small" icon={<SwapOutlined />} onClick={() => onTransfer(employee)}>调店</Button> : null}
                {currentHere ? (
                  <Popconfirm
                    title={employee.isResigned ? "确定恢复该员工在职？" : "确定办理该员工离职？"}
                    onConfirm={() => onToggleResignation(employee, !employee.isResigned)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button size="small" danger={!employee.isResigned} icon={employee.isResigned ? <UserAddOutlined /> : <UserDeleteOutlined />}>
                      {employee.isResigned ? "恢复在职" : "办理离职"}
                    </Button>
                  </Popconfirm>
                ) : null}
              </div>
            </Card>
          ))}
        </Space>
      ) : (
        <Card title={`岗位成员列表 (当前显示 ${visibleCards.length} 位)`} style={{ borderRadius: 8 }}>
          <Table columns={columns} dataSource={visibleCards} rowKey={(item) => item.employee.id} pagination={{ pageSize: 10, showSizeChanger: true }} size="middle" />
        </Card>
      )}

      {/* 匿名成员履历 Drawer */}
      <Drawer
        title={historyDrawerEmployee ? `${historyDrawerEmployee.name} - 岗位履历` : "成员履历"}
        placement="right"
        width={500}
        onClose={() => setHistoryDrawerEmployee(null)}
        open={Boolean(historyDrawerEmployee)}
      >
        {historyDrawerEmployee && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Descriptions title="基本薪资组件" column={1} bordered size="small">
              <Descriptions.Item label="成员代号">{historyDrawerEmployee.name}</Descriptions.Item>
              <Descriptions.Item label="系统编号">{historyDrawerEmployee.id.slice(-8)}</Descriptions.Item>
              <Descriptions.Item label="基础工资">{formatCurrency(historyDrawerEmployee.baseSalary)}</Descriptions.Item>
              <Descriptions.Item label="加班时薪">{historyDrawerEmployee.overtimeRate} 元/小时</Descriptions.Item>
              <Descriptions.Item label="全勤奖金">{formatCurrency(historyDrawerEmployee.attendanceBonus)}</Descriptions.Item>
              <Descriptions.Item label="在职状态">
                <Tag color={historyDrawerEmployee.isResigned ? "error" : "success"}>
                  {historyDrawerEmployee.isResigned ? `已离职 (${historyDrawerEmployee.resignationDate})` : "在职"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>门店任职调动轨迹</Title>
              <Timeline
                items={drawerAssignments.map((a) => ({
                  color: a.storeId === store.id ? "green" : "blue",
                  children: (
                    <div>
                      <Text strong>{storeMap.get(a.storeId)?.name ?? a.storeId}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {a.startMonth} 至 {a.endMonth ?? "现在"} · {a.reason || "常规门店分配"}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </div>

            <div>
              <Title level={5}>调薪变更历史</Title>
              {drawerAdjustments.length === 0 ? (
                <Text type="secondary">暂无调薪记录</Text>
              ) : (
                <Timeline
                  items={drawerAdjustments.map((record) => ({
                    color: "orange",
                    children: (
                      <div>
                        <Text strong>{record.itemLabel}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.date} · {record.previousValue} → {record.newValue}
                        </Text>
                        {record.reason && (
                          <Paragraph type="secondary" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                            {record.reason}
                          </Paragraph>
                        )}
                      </div>
                    ),
                  }))}
                />
              )}
            </div>
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
