import { useEffect, useCallback } from "react";
import { CloseOutlined, LoadingOutlined } from "@ant-design/icons";

interface DrawerFormProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  width?: number | string;
  children: React.ReactNode;
}

export default function DrawerForm({
  isOpen,
  title,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  width = 560,
  children,
}: DrawerFormProps) {
  // Close on ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    },
    [isOpen, isSubmitting, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="ds-drawer-overlay"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Drawer Panel */}
      <div 
        className={`ds-drawer-panel ${isOpen ? "open" : ""}`}
        style={{ width: typeof width === "number" ? `${width}px` : width }}
      >
        {/* Header */}
        <div className="ds-drawer-header">
          <h2 className="ds-drawer-title">{title}</h2>
          <button
            className="ds-drawer-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close drawer"
          >
            <CloseOutlined />
          </button>
        </div>

        {/* Body */}
        <div className="ds-drawer-body">{children}</div>

        {/* Footer */}
        <div className="ds-drawer-footer">
          <button
            className="ds-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minWidth: 90 }}
          >
            {cancelLabel}
          </button>
          <button
            className="ds-btn-primary"
            onClick={onSubmit}
            disabled={isSubmitting}
            style={{ minWidth: 120 }}
          >
            {isSubmitting ? (
              <>
                <LoadingOutlined style={{ marginRight: 6 }} />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    </>
  );
}
