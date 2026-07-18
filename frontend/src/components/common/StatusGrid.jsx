/**
 * StatusGrid — generic sticky-header table with inline-editable cells.
 *
 * Column shape:
 *   {
 *     key:         string              — row field name
 *     label:       string              — header text
 *     type?:       "display"           — plain text (default)
 *                | "link"             — styled anchor (not editable)
 *                | "number"           — editable number input
 *                | "readonly_number"  — grey readonly number input
 *                | "text"             — editable text input
 *                | "select"           — dropdown (requires options[])
 *     options?:    string[] | { value, label }[]   — for type "select"
 *     width?:      number | string     — input width (px or "100%")
 *     minWidth?:   number              — <th> min-width
 *     align?:      "left"|"center"|"right"
 *     min?:        number              — for type "number"
 *     max?:        number              — for type "number"
 *     placeholder?: string            — for type "text"
 *   }
 *
 * Props:
 *   columns            — column definitions (see above)
 *   rows               — data rows array
 *   onCellChange       — (rowId, key, value) => void  called on any edit
 *   onSelectAll        — (e) => void
 *   onSelectRow        — (rowId) => void
 *   rowIdKey           — field used as row id (default "id")
 *   statusKey          — field whose value drives row background color (default "status")
 *   rowColors          — { [statusValue]: colorHex }
 *   checkboxSelection  — bool (default true)
 *   maxHeight          — scroll container max-height (default 600)
 *   headerColor        — thead background (default "#0d47a1")
 *   minWidth           — table min-width override (default auto)
 */

const thStyle = { padding: 10, border: "1px solid #ccc", whiteSpace: "nowrap" };
const tdBase = { padding: 6, border: "1px solid #ddd" };
const inputBase = { padding: "4px 6px", border: "1px solid #d9dfe8", borderRadius: 4 };
const readonlyBase = { ...inputBase, background: "#f5f5f5" };

export default function StatusGrid({
  columns = [],
  rows = [],
  onCellChange,
  onSelectAll,
  onSelectRow,
  rowIdKey = "id",
  statusKey = "status",
  rowColors = {},
  checkboxSelection = true,
  maxHeight = 600,
  headerColor = "#0d47a1",
  minWidth,
}) {
  const getRowBg = (row, index) => {
    if (index % 2 !== 0) return "#fff";
    return rowColors[row[statusKey]] || "#fafafa";
  };

  const renderCell = (col, row) => {
    const val = row[col.key] ?? "";
    const cellStyle = { ...tdBase, textAlign: col.align || "left" };

    switch (col.type) {
      case "link":
        return (
          <td key={col.key} style={cellStyle}>
            <a href="#" style={{ textDecoration: "none", color: "#1565c0", fontWeight: "bold" }}>
              {val}
            </a>
          </td>
        );

      case "number":
        return (
          <td key={col.key} style={cellStyle}>
            <input
              type="number"
              value={val}
              min={col.min ?? 0}
              {...(col.max != null ? { max: col.max } : {})}
              style={{ ...inputBase, width: col.width || 80 }}
              onChange={(e) => onCellChange?.(row[rowIdKey], col.key, e.target.value)}
            />
          </td>
        );

      case "readonly_number":
        return (
          <td key={col.key} style={cellStyle}>
            <input
              type="number"
              value={val}
              readOnly
              style={{ ...readonlyBase, width: col.width || 80 }}
            />
          </td>
        );

      case "text":
        return (
          <td key={col.key} style={cellStyle}>
            <input
              type="text"
              value={val}
              placeholder={col.placeholder || ""}
              style={{ ...inputBase, width: col.width || "100%" }}
              onChange={(e) => onCellChange?.(row[rowIdKey], col.key, e.target.value)}
            />
          </td>
        );

      case "select":
        return (
          <td key={col.key} style={cellStyle}>
            <select
              value={val}
              style={{ ...inputBase, fontSize: 12 }}
              onChange={(e) => onCellChange?.(row[rowIdKey], col.key, e.target.value)}
            >
              {(col.options || []).map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                return <option key={optVal} value={optVal}>{optLabel}</option>;
              })}
            </select>
          </td>
        );

      default:
        return (
          <td key={col.key} style={cellStyle}>
            {val}
          </td>
        );
    }
  };

  return (
    <div style={{ overflow: "auto", maxHeight, border: "1px solid #d9dfe8" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          ...(minWidth ? { minWidth } : {}),
        }}
      >
        <thead>
          <tr style={{ background: headerColor, color: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
            {checkboxSelection && (
              <th style={thStyle}>
                <input type="checkbox" onChange={onSelectAll} />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ ...thStyle, ...(col.minWidth ? { minWidth: col.minWidth } : {}) }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[rowIdKey] ?? index} style={{ background: getRowBg(row, index) }}>
              {checkboxSelection && (
                <td align="center" style={tdBase}>
                  <input
                    type="checkbox"
                    checked={row.selected || false}
                    onChange={() => onSelectRow?.(row[rowIdKey])}
                  />
                </td>
              )}
              {columns.map((col) => renderCell(col, row))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
