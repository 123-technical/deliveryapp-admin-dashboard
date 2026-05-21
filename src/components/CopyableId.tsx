import { useState, useCallback } from "react";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";

interface CopyableIdProps {
  id: string;
  truncate?: number;
}

export default function CopyableId({ id, truncate = 8 }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [id]
  );

  return (
    <span className="ds-id-wrapper">
      <span className="ds-id-text">{id.substring(0, truncate)}…</span>
      <button className="ds-copy-btn" onClick={handleCopy} title="Copy ID">
        {copied ? (
          <CheckOutlined style={{ fontSize: 11, color: "#10B981" }} />
        ) : (
          <CopyOutlined style={{ fontSize: 11 }} />
        )}
        {copied && <span className="ds-copy-tooltip">Copied!</span>}
      </button>
    </span>
  );
}
