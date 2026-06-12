import { useLocation } from "react-router-dom";
import footerLogo from "../images/footer-log.png";
import footerLogo2 from "../images/aaa.png";

export default function Footer() {
  const { pathname } = useLocation();
  const imageWidth = pathname === "/" ? "90vw" : "83vw";

  return (
    <div
      style={{
        background: "#f8f9fe",
        borderTop: "1px solid #e5e7eb",
        padding: "0px 0px",
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
              maxHeight: "60px",
              width: imageWidth,
              borderRadius: "2%",
              boxShadow: "0px 0px 15px 5px rgba(248, 249, 250, 0.6)"
            }}
          />
          {/* <img
            src={footerLogo2}
            alt="Saral Samadhan"
            style={{
              maxHeight: "40px",
              width: imageWidth
            }}
          /> */}
        </div>
        <p style={{ fontSize: 12, color: "#6b7280" }}>
          © 2026 Saral Samadhan. All rights reserved.
        </p>
      </div>
    </div>
  );
}
