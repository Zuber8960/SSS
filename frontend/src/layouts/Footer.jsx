import { getTenantConfig } from "../utils/tenantService";
import fallbackFooter from "../images/footer-log.png";

export default function Footer() {

  const config = getTenantConfig();
  const footerSrc = config?.footer_image_url || fallbackFooter;
  const tenantName = config?.tenant_name || "Saral Samadhan";

  const imgStyle = {
    width: "50%",
    height: "auto",
    maxHeight: "60px",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        background: "#f8f9fe",
        borderTop: "1px solid #e5e7eb",
        flexShrink: 0,
        zIndex: 1,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", width: "100%", overflow: "hidden" }}>
        <img src={footerSrc} alt={tenantName} style={imgStyle} onError={e => { e.target.src = fallbackFooter; }} />
        <img src={footerSrc} alt={tenantName} style={imgStyle} onError={e => { e.target.src = fallbackFooter; }} />
      </div>
      <p style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "4px 8px", margin: 0 }}>
        © 2026 {tenantName}. All rights reserved.
      </p>
    </div>
  );
}
