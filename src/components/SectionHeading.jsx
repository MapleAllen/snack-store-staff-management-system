import { Typography, Tag, Flex } from "antd";

const { Title, Paragraph } = Typography;

export function SectionHeading({ eyebrow, title, description, action, id }) {
  return (
    <div className="section-heading" style={{ marginBottom: 16 }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap="small">
        <div>
          {eyebrow && <Tag color="geekblue" style={{ marginBottom: 4 }}>{eyebrow}</Tag>}
          <Title level={4} id={id} style={{ margin: 0 }}>{title}</Title>
          {description ? <Paragraph type="secondary" style={{ margin: "2px 0 0 0", fontSize: 13 }}>{description}</Paragraph> : null}
        </div>
        {action}
      </Flex>
    </div>
  );
}

