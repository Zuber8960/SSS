import {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle,
  ReceiptLong, AccountBalanceWallet, Inventory2,
  CancelScheduleSend, AssignmentTurnedIn, Receipt, Factory,
  Route, Insights, Group, AirportShuttle, TrendingUp,
} from "@mui/icons-material";
import "../../styles/MasterPage.css";
import { DataTable } from "./MasterPage";

/**
 * DashboardOverview — executive landing section rendered below the dashboard.
 * Sections: Executive Overview, Operations, Manifest & Vehicle Performance,
 * Customer Wise Analysis, Vendor Wise Analysis.
 * All data is fetched from the DB via GET /dashboard/overview and passed
 * through the `data` prop; `loading` shows shimmer placeholders until it arrives.
 */

const SUB_TONES = {
  green: { color: "#059669", background: "#ecfdf5" },
  orange: { color: "#ea580c", background: "#fff7ed" },
  blue: { color: "#2563eb", background: "#eff6ff" },
  red: { color: "#dc2626", background: "#fef2f2" },
};

const ACCENTS = {
  purple: ["linear-gradient(90deg, #a855f7, #7c3aed)", "#f3e8ff", "#7c3aed"],
  blue: ["linear-gradient(90deg, #3b82f6, #2563eb)", "#eff6ff", "#2563eb"],
  green: ["linear-gradient(90deg, #34d399, #059669)", "#ecfdf5", "#059669"],
  orange: ["linear-gradient(90deg, #fb923c, #ea580c)", "#fff7ed", "#ea580c"],
  red: ["linear-gradient(90deg, #f87171, #dc2626)", "#fef2f2", "#dc2626"],
  violet: ["linear-gradient(90deg, #8b5cf6, #6d28d9)", "#f5f3ff", "#6d28d9"],
};

const ICONS = {
  ShoppingBag, PendingActions, LocalShipping, CheckCircle, ReceiptLong,
  AccountBalanceWallet, Inventory2, CancelScheduleSend, AssignmentTurnedIn,
  Receipt, Factory, Route, Insights, Group, AirportShuttle, TrendingUp,
};

const getIcon = (name) => ICONS[name] || null;

/* Zero-value fallbacks — cards always render (with 0) when the DB has no data */
const ZERO_KPI = [
  { label: "Orders Placed", value: "0", sub: "No data yet", tone: "blue", accent: "green", Icon: "ShoppingBag" },
  { label: "Pickup Pending", value: "0", sub: "No data yet", tone: "blue", accent: "orange", Icon: "PendingActions" },
  { label: "In Transit", value: "0", sub: "No data yet", tone: "blue", accent: "blue", Icon: "LocalShipping" },
  { label: "Delivered", value: "0", sub: "0% delivery rate", tone: "blue", accent: "purple", Icon: "CheckCircle" },
  { label: "Billing Submitted", value: "₹0", sub: "0 invoices", tone: "blue", accent: "violet", Icon: "ReceiptLong" },
  { label: "Realised", value: "₹0", sub: "No data yet", tone: "blue", accent: "blue", Icon: "AccountBalanceWallet" },
];

const ZERO_OPS = [
  { title: "Pickup", accent: "purple", Icon: "ShoppingBag", rows: [["Orders Placed", 0], ["Pickup Done", 0], ["Pending", 0, "#ea580c"]] },
  { title: "Dockets", accent: "blue", Icon: "Inventory2", rows: [["Booked", 0], ["Waiting for Dispatch", 0], ["In Transit (Vehicle)", 0]] },
  { title: "Undelivered", accent: "orange", Icon: "CancelScheduleSend", rows: [["Undelivered Dockets", 0], ["EWB Expiring Today", 0], ["Delivered Not Billed", "₹0"]] },
  { title: "Delivered", accent: "green", Icon: "AssignmentTurnedIn", rows: [["Delivered", 0], ["Undelivered", 0, "#dc2626"], ["Delivery Rate", "0%"]] },
  { title: "Billing & Realisation", accent: "violet", Icon: "Receipt", rows: [["Submitted", "₹0"], ["Unsubmitted", "₹0", "#ea580c"], ["Realised", "₹0"]] },
];

const ZERO_PERF = {
  own: { title: "Own Vehicles", rows: [["In Transit", 0, 0], ["Arrived", 0, 0], ["Total Fleet", 0, 0]] },
  market: { title: "Market / Vendor Vehicles", rows: [["In Transit", 0, 0], ["Arrived", 0, 0], ["Engaged", 0, 0]] },
};


function SectionHead({ title, note, icon: Icon }) {
  return (
    <div className="ovSectionHead">
      <div className="ovSectionHead__title">
        <span className="ovSectionHead__bar" />
        {Icon && <Icon style={{ fontSize: 20, color: "#7c3aed" }} />}
        <h3>{title}</h3>
      </div>
      {note && <span>{note}</span>}
    </div>
  );
}

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}


function LoadingBar({ width = "60%" }) {
  return (
    <span style={{
      display: "inline-block", height: 12, width, borderRadius: 6,
      background: "linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)",
      backgroundSize: "200% 100%", animation: "ovShimmer 1.2s infinite linear",
    }} />
  );
}

function EmptyRow({ colSpan = 15, text = "No data available" }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: "center", color: "#9ca3af", padding: "18px 0", fontSize: 13 }}>
        {text}
      </td>
    </tr>
  );
}

export default function DashboardOverview({ data, loading = false }) {
  const overview = data || {};
  // While loading show skeletons; once loaded, always render cards —
  // falling back to zero-value cards when the DB has no data.
  const hasKpis = (overview.kpis || []).length > 0;
  const hasOps = (overview.ops || []).length > 0;
  const kpis = hasKpis ? overview.kpis : ZERO_KPI;
  const ops = hasOps ? overview.ops : ZERO_OPS;
  const perf = {
    own: overview.perf?.own || ZERO_PERF.own,
    market: overview.perf?.market || ZERO_PERF.market,
  };
  const customers = overview.customers || [];
  const vendors = overview.vendors || [];

  return (
    <div>
      {/* Executive Overview */}
      <SectionHead title="Executive Overview" note="Operational snapshot" icon={Insights} />
      <div className="ovKpiGrid">
        {loading && !kpis.length
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ovKpiCard" style={{ "--ov-accent": "linear-gradient(90deg, #a855f7, #7c3aed)", "--ov-accent-soft": "#f3e8ff", "--ov-accent-strong": "#7c3aed" }}>
                <div className="ovKpiCard__top">
                  <span className="ovKpiCard__label"><LoadingBar width="70%" /></span>
                </div>
                <div className="ovKpiCard__value" style={{ color: "#e5e7eb" }}>—</div>
                <div className="ovKpiCard__sub"><LoadingBar width="55%" /></div>
              </div>
            ))
          : kpis.map((k, i) => {
          const tone = SUB_TONES[k.tone] || SUB_TONES.blue;
          const [grad, soft, strong] = ACCENTS[k.accent] || ACCENTS.purple;
          const Icon = getIcon(k.Icon);
          return (
            <div
              key={k.label}
              className="ovKpiCard"
              style={{ animationDelay: `${i * 60}ms`, "--ov-accent": grad, "--ov-accent-soft": soft, "--ov-accent-strong": strong }}
            >
              <div className="ovKpiCard__top">
                <span className="ovKpiCard__label">{k.label}</span>
                {Icon && (
                  <span className="ovKpiCard__icon" style={{ background: soft, color: strong }}>
                    <Icon style={{ fontSize: 17 }} />
                  </span>
                )}
              </div>
              <div className="ovKpiCard__value">{k.value}</div>
              <div className="ovKpiCard__sub" style={{ color: tone.color }}>
                <span style={{ background: tone.background, padding: "3px 9px", borderRadius: 999, display: "inline-block" }}>
                  {k.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations */}
      <SectionHead title="Operations" note="Shipment lifecycle" icon={Route} />
      <div className="ovOpsGrid">
        {loading && !ops.length
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ovOpsCard" style={{ "--ov-accent-soft": "#f3e8ff", "--ov-accent-strong": "#7c3aed" }}>
                <div className="ovOpsCard__title"><LoadingBar width="40%" /></div>
                <LoadingBar width="80%" /> <div style={{ height: 10 }} />
                <LoadingBar width="65%" />
              </div>
            ))
          : ops.map((card, i) => {
          const [, soft, strong] = ACCENTS[card.accent] || ACCENTS.purple;
          const Icon = getIcon(card.Icon);
          return (
            <div
              key={card.title}
              className="ovOpsCard"
              style={{ animationDelay: `${i * 60}ms`, "--ov-accent-soft": soft, "--ov-accent-strong": strong }}
            >
              <div className="ovOpsCard__title">
                {Icon && <Icon className="ovOpsCard__icon" style={{ fontSize: 17 }} />}
                {card.title}
              </div>
              {card.rows.map(([label, value, color]) => (
                <div key={label} className="ovOpsRow">
                  <span>{label}</span>
                  <span style={color ? { color } : undefined}>{value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Manifest & Vehicle Performance */}
      <SectionHead title="Manifest & Vehicle Performance" note="Own fleet vs market / vendor vehicles" icon={AirportShuttle} />
      <div className="ovPerfGrid">
        {[perf.own, perf.market].filter(Boolean).map((p, i) => {
          const totOnTime = p.rows.reduce((a, r) => a + Number(r[1] || 0), 0);
          const totDelayed = p.rows.reduce((a, r) => a + Number(r[2] || 0), 0);
          const share = Math.round((totOnTime / Math.max(totOnTime + totDelayed, 1)) * 100);
          return (
            <div key={p.title} className="ovPerfCard" style={{ animationDelay: `${i * 80}ms` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="ovOpsCard__title" style={{ background: "transparent", border: "none", margin: 0, padding: 0 }}>
                  <LocalShipping style={{ fontSize: 18, color: "#7c3aed" }} />
                  {p.title}
                </div>
                <span className="ovPill" style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" }}>
                  {share}% on time
                </span>
              </div>
              <table className="ovPerfTable">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>On Time</th>
                    <th>Delayed</th>
                  </tr>
                </thead>
                <tbody>
                  {p.rows.map(([status, onTime, delayed]) => (
                    <tr key={status}>
                      <td style={{ fontWeight: 500, color: "#374151" }}>{status}</td>
                      <td style={{ color: "#059669", fontWeight: 700 }}>{onTime}</td>
                      <td style={{ color: "#dc2626", fontWeight: 700 }}>{delayed ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ovPerfBar">
                <div className="ovPerfBar__fill" style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Wise Analysis */}
      <div className="ovTableCard">
        <div className="ovTableCard__head">
          <h3><Group className="ovTableCard__icon" /> Customer Wise Analysis</h3>
          <span className="ovPill"><TrendingUp style={{ fontSize: 13 }} /> Top accounts</span>
        </div>
        <div style={{ padding: "4px 14px 10px" }}>
          <DataTable
            columns={[
              { key: "name", label: "Name", minWidth: 200, render: (r) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="ovAvatar">{initials(r.name)}</span>{r.name}
                </span>
              ) },
              { key: "pan", label: "PAN", minWidth: 120 },
              { key: "gstin", label: "GSTIN", minWidth: 160 },
              { key: "location", label: "Location", minWidth: 110 },
              { key: "total", label: "Total Bkg", minWidth: 90 },
              { key: "delivered", label: "Delivered", minWidth: 95 },
              { key: "undelivered", label: "Undelivered", minWidth: 100 },
              { key: "billed", label: "Billed", minWidth: 90 },
              { key: "submitted", label: "Submitted", minWidth: 95 },
              { key: "realised", label: "Realised", minWidth: 90 },
              { key: "belowCd", label: "Below CD", minWidth: 90 },
              { key: "aboveCd", label: "Above CD", minWidth: 90 },
              { key: "osDays", label: "OS Days", minWidth: 85 },
              { key: "cn", label: "CN", minWidth: 70 },
              { key: "dn", label: "DN", minWidth: 70 },
            ]}
            rows={customers}
            getKey={(r) => r.name}
            actions={[]}
            autoHeight
          />
        </div>
      </div>

      {/* Vendor Wise Analysis */}
      <div className="ovTableCard">
        <div className="ovTableCard__head">
          <h3><Factory className="ovTableCard__icon" /> Vendor Wise Analysis</h3>
          <span className="ovPill" style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" }}>Fleet performance</span>
        </div>
        <div style={{ padding: "4px 14px 10px" }}>
          <DataTable
            columns={[
              { key: "name", label: "Name", minWidth: 200, render: (r) => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="ovAvatar">{initials(r.name)}</span>{r.name}
                </span>
              ) },
              { key: "type", label: "Type", minWidth: 90 },
              { key: "pan", label: "PAN", minWidth: 120 },
              { key: "gstin", label: "GSTIN", minWidth: 160 },
              { key: "location", label: "Location", minWidth: 110 },
              { key: "engaged", label: "Veh Engaged", minWidth: 105 },
              { key: "totalHire", label: "Total Hire", minWidth: 95 },
              { key: "onTime", label: "On Time Trips", minWidth: 110 },
              { key: "delayed", label: "Delayed Trips", minWidth: 110, render: (r) => (
                <span style={{ color: "#dc2626" }}>{r.delayed}</span>
              ) },
              { key: "safe", label: "Safe Trips", minWidth: 95 },
              { key: "remarked", label: "Remarked Trips", minWidth: 120 },
              { key: "paid", label: "Paid", minWidth: 90 },
              { key: "balance", label: "Balance", minWidth: 90 },
              { key: "deductions", label: "Deductions", minWidth: 100 },
              { key: "rating", label: "Rating", minWidth: 90, render: (r) => (
                <span className="ovRating">{r.rating}</span>
              ) },
            ]}
            rows={vendors}
            getKey={(r) => r.name}
            actions={[]}
            autoHeight
          />
        </div>
      </div>
    </div>
  );
}
