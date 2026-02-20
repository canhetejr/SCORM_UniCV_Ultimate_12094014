import React from "react";
import { Modal, Button, Field, Input } from "../ui";
import { STATUS_OPTIONS } from "../../lib";

interface NewVitrineModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  onTitleChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  creating: boolean;
}

export function NewVitrineModal({
  open,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  status,
  onStatusChange,
  creating
}: NewVitrineModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => !creating && onClose()}
      title="Nova Vitrine"
      className="modal-nova-vitrine"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-nova-vitrine"
            disabled={creating || !title.trim()}
          >
            {creating ? "A criar…" : "Criar"}
          </Button>
        </>
      }
    >
      <form id="form-nova-vitrine" onSubmit={onSubmit}>
        <Field label="Título *">
          <Input
            value={title}
            onChange={onTitleChange}
            placeholder="Ex.: Enfermagem - Módulo 1"
            autoFocus
          />
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
