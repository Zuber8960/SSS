import { useState } from "react";
import { Button, TextField } from "@mui/material";
import MainLayout from "../../layouts/MainLayout";
import { PageBody } from "../../components/common/MasterPage";
import { fetchEwbStatus } from "../../utils/docket";

const pretty = (value) => {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function EwbStatus() {
  const [ewbNo, setEwbNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);

  const showStatus = async () => {
    const no = ewbNo.trim();
    if (!no) {
      setError("Enter an e-way bill number");
      setStatus(null);
      return;
    }
    setLoading(true);
    setError("");
    setStatus(null);
    try {
      const data = await fetchEwbStatus(no);
      if (data?.success === false) {
        setError(data.message || "Unable to check this e-way bill");
        return;
      }
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to check this e-way bill");
    } finally {
      setLoading(false);
    }
  };

  const found = Boolean(status?.found);

  return (
    <MainLayout>
      <PageBody title="EWB Status">
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
            Enter an e-way bill number and press Show. This uses the same request as the refresh button on Docket, through this computer&apos;s server.
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              label="E-Way Bill No"
              size="small"
              value={ewbNo}
              onChange={(e) => setEwbNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") showStatus();
              }}
              sx={{ width: 280 }}
            />
            <Button
              variant="contained"
              disabled={loading}
              onClick={showStatus}
              sx={{ textTransform: "none", fontWeight: 700, background: "#0d6efd" }}
            >
              {loading ? "Checking..." : "Show"}
            </Button>
          </div>
          {error ? <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>{error}</div> : null}
        </div>

        {status ? (
          <>
            <div style={{ ...resultStyle, background: found ? "#dcfce7" : "#fee2e2", color: found ? "#166534" : "#991b1b" }}>
              <div style={{ fontSize: 18 }}>{status.result}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{status.reason}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                HTTP {status.httpStatus ?? "—"}
                {status.source ? ` · Source: ${status.source}` : ""}
              </div>
            </div>
            <div style={panelsStyle}>
              <JsonPanel title="Input JSON" text={pretty(status.input)} />
              <JsonPanel title="Output JSON" text={pretty(status.output)} />
            </div>
          </>
        ) : null}
      </PageBody>
    </MainLayout>
  );
}

function JsonPanel({ title, text }) {
  return (
    <div style={panelStyle}>
      <div style={panelTitleStyle}>{title}</div>
      <pre style={preStyle}>{text}</pre>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #dbe3ee",
  borderRadius: 8,
  padding: 16,
  marginBottom: 14,
};

const resultStyle = {
  borderRadius: 8,
  padding: "12px 16px",
  fontWeight: 800,
  marginBottom: 14,
};

const panelsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
};

const panelStyle = {
  background: "#fff",
  border: "1px solid #dbe3ee",
  borderRadius: 8,
  minWidth: 0,
};

const panelTitleStyle = {
  padding: "10px 12px",
  fontWeight: 700,
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const preStyle = {
  margin: 0,
  padding: 12,
  maxHeight: 520,
  overflow: "auto",
  fontSize: 12,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
