import { useLocation } from "react-router-dom";
import footerLogo from "../images/footer-log.png";

export default function Footer() {
  const { pathname } = useLocation();
  const isLoginPage = pathname === "/";
  const imageWidth = isLoginPage ? "90vw" : "83vw";

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
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden"
      }}>
        <div style={{
           display: "flex",
           flexDirection: "row",
           alignItems: "center",
           justifyContent: "center",
           padding: "0 8px"
        }}>
          <img
            src={footerLogo}
            alt="Saral Samadhan"
            style={{
              maxHeight: isLoginPage ? "50px" : "60px",
              width: isLoginPage ? "85vw" : imageWidth,
              maxWidth: isLoginPage ? "90vw" : "calc(100vw - 80px)",
              borderRadius: "2%",
              boxShadow: "0px 0px 15px 5px rgba(248, 249, 250, 0.6)"
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", padding: "4px 8px" }}>
          © 2026 Saral Samadhan. All rights reserved.
        </p>
      </div>
    </div>
  );
}