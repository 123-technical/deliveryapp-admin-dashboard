/**
 * Ant Design Form-compatible wrapper for ImageUpload.
 * Ant Design Form.Item passes `value` and `onChange` props to its children.
 * This component bridges that interface to the ImageUpload component.
 */
import ImageUpload from "./ImageUpload";

interface AntdImageUploadProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  label?: string;
  disabled?: boolean;
}

export default function AntdImageUpload({
  value,
  onChange,
  label,
  disabled,
}: AntdImageUploadProps) {
  return (
    <ImageUpload
      value={value}
      onChange={(url) => onChange?.(url)}
      label={label}
      disabled={disabled}
    />
  );
}
