import React from "react";
import { Modal } from "../ui";

interface VitrinePreviewModalProps {
  open: boolean;
  onClose: () => void;
  playerUrl: string;
}

export function VitrinePreviewModal({ open, onClose, playerUrl }: VitrinePreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview"
      className="modal-large"
    >
      <iframe
        src={playerUrl}
        title="Preview do player"
        style={{ width: "100%", height: 500, border: "none" }}
      />
    </Modal>
  );
}
