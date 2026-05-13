/**
 * Ant Design Form-compatible wrapper for ImageUpload.
 * Ant Design Form.Item passes `value` and `onChange` props to its children.
 * This component bridges that interface to the ImageUpload component.
 */
import { useEffect, useState } from "react";
import ImageUpload from "./ImageUpload";

interface AntdImageUploadProps {
  value?: string | File;
  onChange?: (value: string | File | undefined) => void;
  label?: string;
  disabled?: boolean;
}

export default function AntdImageUpload({
  value,
  onChange,
  label,
  disabled,
}: AntdImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(value);
    }
  }, [value]);

  return (
    <ImageUpload
      value={previewUrl}
      onFileSelect={(file) => onChange?.(file)}
      label={label}
      disabled={disabled}
    />
  );
}
