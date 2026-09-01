import { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { getTenantConfig } from "../utils/tenantService";
import GetAllDetailsPopup from "../components/common/GetAllDetailsPopup";
import { Tooltip } from "@mui/material";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);

  const tenantConfig = getTenantConfig();
  const gradient = tenantConfig?.brand?.gradient || "linear-gradient(135deg, #7c3aed, #a855f7)";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Search Engine"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1200,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: gradient,
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.12)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.35)";
        }}
      >
        <SearchIcon style={{ fontSize: 24 }} />
      </button>

      <GetAllDetailsPopup open={open} onClose={() => setOpen(false)} />
    </>
  );
}
