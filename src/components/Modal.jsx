import { Modal as AntModal } from "antd";

export function Modal({ title, children, onClose }) {
  return (
    <AntModal
      open={true}
      title={title}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
    >
      {children}
    </AntModal>
  );
}

