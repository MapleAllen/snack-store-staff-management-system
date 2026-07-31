import { Typography, Tag, Flex } from "antd";

const { Title, Paragraph } = Typography;

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header" style={{ marginBottom: 20 }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap="small">
        <div>
          {eyebrow && <Tag color="blue" style={{ marginBottom: 6 }}>{eyebrow}</Tag>}
          <Title level={2} style={{ margin: 0 }}>{title}</Title>
          {description && <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>{description}</Paragraph>}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </Flex>
    </div>
  );
}

