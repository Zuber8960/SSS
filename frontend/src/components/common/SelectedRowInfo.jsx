export default function SelectedRowInfo({ row, emptyText = "No row selected — click a row to select" }) {
  if (!row) {
    return (
      <div style={{
        marginTop: 10, padding: "7px 14px",
        background: "#f9fafb", borderRadius: 8,
        border: "1.5px dashed #d1d5db",
        fontSize: 13, color: "#9ca3af", fontStyle: "italic",
      }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      marginTop: 10, padding: "8px 14px",
      background: "#f3e8ff", borderRadius: 8,
      border: "1.5px solid #d8b4fe",
      fontSize: 13,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "#7e22ce" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7e22ce", display: "inline-block" }} />
        {row.docket_no}
      </span>
      <span style={{ color: "#6b7280" }}>|</span>
      <span style={{ color: "#374151" }}>{row.cnor_name || "—"}</span>
      <span style={{ color: "#7e22ce", fontWeight: 600 }}>→</span>
      <span style={{ color: "#374151" }}>{row.cnee_name || "—"}</span>
      <span style={{ color: "#6b7280" }}>|</span>
      <span style={{ color: "#374151" }}>
        {row.docket_pickup_town || row.docket_loc || "—"}
        <span style={{ color: "#7e22ce", fontWeight: 600, margin: "0 4px" }}>→</span>
        {row.docket_dly_town || row.docket_to_loc || "—"}
      </span>
      {row.delivery_status && (
        <>
          <span style={{ color: "#6b7280" }}>|</span>
          <span style={{
            padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: row.delivery_status === "Delivered" ? "#dcfce7" : "#fff7ed",
            color: row.delivery_status === "Delivered" ? "#15803d" : "#ea580c",
          }}>
            {row.delivery_status}
          </span>
        </>
      )}
    </div>
  );
}
