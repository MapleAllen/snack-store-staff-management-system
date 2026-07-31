import { useState } from "react";
import { Card, Table, Tag, Button, Space, Input, Select, Row, Col, Timeline, Typography, Avatar, Popconfirm } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  SwapOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../components/PageHeader.jsx";
import { SectionHeading } from "../components/SectionHeading.jsx";
import { formatCurrency, getAssignmentAtMonth, getEmployeeAssignments, getEmployeesWithStoreHistory } from "../payrollLogic.js";

const { Text, Title, Paragraph } = Typography;

export function EmployeesPage({ workspace, store, currentMonth, onCreate, onEdit, onToggleResignation, onTransfer }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const visibleCards = cards.filter(({ employee, currentHere }) => {
    if (!employee.name.includes(searchTerm.trim())) return false;
    if (statusFilter === "active") return currentHere && !employee.isResigned;
    if (statusFilter === "pending") return currentHere && !employee.isResigned && !employee.salaryConfigured;
    if (statusFilter === "history") return employee.isResigned || !currentHere;
    return true;
  });

  const columns = [
    {
      title: "员工信息",
      dataIndex: ["employee", "name"],
      key: "name",
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: record.employee.isResigned ? "#d9d9d9" : "#1677ff" }}>
            {record.employee.name.slice(-1)}
          </Avatar>
          <div>
            <Text strong>{record.employee.name}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>工号：{record.employee.id}</Text>
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
          return <Tag color="default">已离职 ({employee.resignationDate})</Tag>;
        }
        if (!employee.salaryConfigured) {
          return <Tag color="warning">薪资待设置</Tag>;
        }
        if (currentHere) {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="success">当前在本店</Tag>
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
            <Tag color="cyan">历史员工</Tag>
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
      render: (val) => formatCurrency(val),
    },
    {
      title: "加班时薪",
      dataIndex: ["employee", "overtimeRate"],
      key: "overtimeRate",
      render: (val) => `${val} / 小时`,
    },
    {
      title: "全勤奖金",
      dataIndex: ["employee", "attendanceBonus"],
      key: "attendanceBonus",
      render: (val) => formatCurrency(val),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => {
        const { employee, currentHere } = record;
        return (
          <Space wrap size="small">
            <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(employee)}>
              编辑姓名
            </Button>
            {currentHere && !employee.isResigned && (
              <Button size="small" icon={<SwapOutlined />} onClick={() => onTransfer(employee)}>
                调店
              </Button>
            )}
            {currentHere && (
              <Popconfirm
                title={employee.isResigned ? "确定恢复该员工在职？" : "确定办理该员工离职？"}
                onConfirm={() => onToggleResignation(employee, !employee.isResigned)}
                okText="确定"
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

  const storeAdjustments = workspace.adjustments.filter((record) => record.storeId === store.id);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <PageHeader
        eyebrow="员工管理"
        title={`${store.name} 员工档案`}
        description="维护员工档案、在职状态和按月生效的跨店调动。"
        actions={
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={onCreate}>
            新增员工
          </Button>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={17}>
          <Card
            title={`本店员工列表 (${visibleCards.length}/${cards.length})`}
            extra={
              <Space wrap>
                <Input
                  placeholder="搜索姓名"
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 160 }}
                  allowClear
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                  options={[
                    { value: "all", label: "全部员工" },
                    { value: "active", label: "当前在岗" },
                    { value: "pending", label: "薪资待设置" },
                    { value: "history", label: "历史员工" },
                  ]}
                />
              </Space>
            }
            style={{ borderRadius: 8 }}
          >
            <Table
              columns={columns}
              dataSource={visibleCards}
              rowKey={(item) => item.employee.id}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <Card title="最近调薪记录" style={{ borderRadius: 8 }}>
            {storeAdjustments.length === 0 ? (
              <Text type="secondary">当前门店还没有调薪记录。</Text>
            ) : (
              <Timeline
                items={storeAdjustments.slice(0, 8).map((record) => ({
                  color: "blue",
                  children: (
                    <div>
                      <Text strong>{record.employeeName}</Text> · <Tag>{record.itemLabel}</Tag>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.date} · {record.previousValue} → {record.newValue}
                      </Text>
                      {record.notes && (
                        <Paragraph type="secondary" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                          {record.notes}
                        </Paragraph>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
