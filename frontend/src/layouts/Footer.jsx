import { useLocation } from "react-router-dom";
import footerLogo from "../images/aaa2.jpg";
import footerLogo2 from "../images/aaa.png";

export default function Footer() {
  const { pathname } = useLocation();
  const imageWidth = pathname === "/" ? "45vw" : "40vw";

  return (
    <div
      style={{
        background: "#f8f9fa",
        borderTop: "1px solid #e5e7eb",
        padding: "0px 5px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
        zIndex: 1
      }}
    >
      <div style={{
        textAlign: "center",
      }}>
        <div style={{
           display: "flex", flexDirection: "row", alignItems: "center"
        }}>
          <img
            src={footerLogo}
            alt="Saral Samadhan"
            style={{
              maxHeight: "40px",
              width: imageWidth
            }}
          />
          <img
            src={footerLogo2}
            alt="Saral Samadhan"
            style={{
              maxHeight: "40px",
              width: imageWidth
            }}
          />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280" }}>
          © 2026 Saral Samadhan. All rights reserved.
        </p>
      </div>
    </div>
  );
}
