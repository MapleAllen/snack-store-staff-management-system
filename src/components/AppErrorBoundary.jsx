import { Component } from "react";
import { Button, Result, Typography } from "antd";

const { Paragraph } = Typography;

export class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Result
        status="error"
        title="此页面暂时无法打开"
        subTitle="数据没有被修改。请返回总览或刷新应用后重试。"
        extra={[
          <Button key="home" type="primary" onClick={() => window.location.reload()}>
            重新加载应用
          </Button>,
        ]}
      >
        {import.meta.env.DEV ? (
          <Paragraph code style={{ maxWidth: 760, margin: "0 auto", textAlign: "left" }}>
            {this.state.error.message}
          </Paragraph>
        ) : null}
      </Result>
    );
  }
}
