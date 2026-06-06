import { useNavigate } from "react-router-dom";
import { logout as logoutUser } from "../utils/authService";

export default function Header() {

  const navigate = useNavigate();

  const logout = () => {
    logoutUser();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        height: "70px",
        background: "#ffffff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 28px",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111" }}>
          Logistics ERP
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #a855f7, #7e22ce)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 600,
          fontSize: 14
        }}>
          AD
        </div>

        <button
          onClick={logout}
          style={{
            padding: "8px 16px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => e.target.style.background = "#b91c1c"}
          onMouseLeave={(e) => e.target.style.background = "#dc2626"}
        >
          Logout
        </button>
      </div>
    </div>
  );
}