import { Modal as AntModal } from "antd";

export function Modal({ title, children, onClose, width }) {
  return (
    <AntModal
      open={true}
      title={title}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={width}
    >
      {children}
    </AntModal>
  );
}

