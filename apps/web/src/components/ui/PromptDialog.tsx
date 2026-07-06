import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface Props {
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function PromptDialog({ title, initial = "", placeholder, confirmLabel = "Salvar", onConfirm, onClose }: Props) {
  const [value, setValue] = useState(initial);
  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!value.trim()} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
    </Modal>
  );
}
