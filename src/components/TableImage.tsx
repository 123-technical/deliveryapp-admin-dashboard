import { useState } from "react";
import { PictureOutlined } from "@ant-design/icons";

interface TableImageProps {
  src?: string | null;
  alt?: string;
}

export default function TableImage({ src, alt = "image" }: TableImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="ds-table-img-fallback">
        <PictureOutlined />
      </div>
    );
  }

  return (
    <img
      className="ds-table-img"
      src={src}
      alt={alt}
      onError={() => setError(true)}
    />
  );
}
