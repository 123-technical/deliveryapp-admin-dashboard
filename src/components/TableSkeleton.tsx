interface TableSkeletonProps {
  columns: number;
  rows?: number;
  hasImage?: boolean;
}

export default function TableSkeleton({
  columns,
  rows = 5,
  hasImage = false,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="ds-skeleton-row">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} style={{ padding: "12px 16px" }}>
              {hasImage && colIdx === 1 ? (
                <div className="ds-skeleton-img" />
              ) : (
                <div
                  className="ds-skeleton-cell"
                  style={{
                    width: colIdx === 0 ? "60px" : colIdx === columns - 1 ? "80px" : "100%",
                    maxWidth: colIdx === 0 ? 60 : undefined,
                  }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
