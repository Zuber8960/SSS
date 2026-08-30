import PincodeSearch from "../../components/common/PincodeSearch";

export default function PincodeSearchPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f3e8ff 0%, #f0f9ff 60%, #ecfdf5 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: 32,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        padding: "32px 36px", width: "100%", maxWidth: 1200, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 26 }}>📍</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111" }}>Pincode Search</h1>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309",
            border: "1px solid #fde68a", borderRadius: 6, padding: "2px 8px",
            letterSpacing: 1, textTransform: "uppercase",
          }}>Dev Tool</span>
        </div>

        <PincodeSearch tableHeight={480} />
      </div>
    </div>
  );
}
