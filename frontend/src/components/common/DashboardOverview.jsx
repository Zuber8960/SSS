import { useEffect, useRef, useState } from "react";
import {
  ShoppingBag, LocalShipping, ReceiptLong, AccountBalanceWallet,
  EventBusy, AssignmentTurnedIn, Receipt, Factory, Insights,
  Group, AirportShuttle,
} from "@mui/icons-material";
import "../../styles/MasterPage.css";
import ExecutiveKpiPopup from "./ExecutiveKpiPopup";
import OrderDrill, { OrderManagementBoard } from "./OrderDrill";
import DespatchDrill, { DespatchManagementBoard } from "./DespatchDrill";
import VehicleDrill, { VehicleBoard } from "./VehicleDrill";
import DeliveryDrill, { DeliveryBoard } from "./DeliveryDrill";
import RevenueDrill, { CollectionBoard, CollectionDrill, EwbBoard, EwbDrill, HireBoard, HireDrill, OutstandingBoard, OutstandingDrill, RevenueBoard, RevenueMonths } from "./RevenueDrill";
import { fetchCollectionBoard, fetchDeliveryBoard, fetchDespatchBoard, fetchEwbBoard, fetchHireBoard, fetchOrderBoard, fetchOutstandingBoard, fetchRevenueBoard, fetchVehicleBoard } from "../../utils/dashboard";

/**
 * DashboardOverview — executive landing section.
 * Management cards through E-way bill expiry, then Customer Wise Analysis
 * and Vendor Wise Analysis.
 * Data comes from GET /dashboard/overview through the `data` prop.
 */

const D = (kind) => ({ source: "docket", kind });
const INV = (kind) => ({ source: "invoice", kind });

const LABEL_SPEC = {
  "orders placed": D("all"),
  "pickup pending": D("pickupPending"),
  "pending": D("pickupPending"),
  "pickup done": D("pickupDone"),
  "in transit": { source: "inTransit", kind: "inTransit" },
  "in transit (vehicle)": { source: "inTransit", kind: "inTransit" },
  "delivered": D("delivered"),
  "booked": D("all"),
  "waiting for dispatch": D("waiting"),
  "undelivered dockets": D("undelivered"),
  "undelivered": D("undelivered"),
  "ewb expiring today": D("ewbToday"),
  "delivered not billed": D("deliveredNotBilled"),
  "delivery rate": D("all"),
  "billing submitted": INV("submitted"),
  "submitted": INV("submitted"),
  "unsubmitted": INV("unsubmitted"),
  "realised": INV("submitted"),
};

const SECTION_SPEC = {
  "Executive Overview": D("all"),
  Operations: D("all"),
  "Manifest & Vehicle Performance": { source: "vehicle", kind: "all", fleet: "all" },
  "Customer Wise Analysis": D("all"),
  "Vendor Wise Analysis": { source: "hire", kind: "all" },
};

const CUSTOMER_SPEC = {
  name: D("all"), total: D("all"), delivered: D("delivered"), undelivered: D("undelivered"),
  billed: INV("all"), submitted: INV("submitted"), realised: INV("submitted"),
  belowCd: D("delivered"), aboveCd: D("delivered"), osDays: D("all"), cn: D("all"), dn: D("all"),
};

const VENDOR_SPEC = {
  name: { source: "hire", kind: "all" }, engaged: { source: "hire", kind: "all" },
  totalHire: { source: "hire", kind: "all" }, onTime: { source: "hire", kind: "all" },
  delayed: { source: "hire", kind: "all" }, safe: { source: "hire", kind: "all" },
  remarked: { source: "hire", kind: "all" }, paid: { source: "hire", kind: "all" },
  balance: { source: "hire", kind: "all" }, deductions: { source: "hire", kind: "all" },
  rating: { source: "hire", kind: "all" },
};

const specForLabel = (label) => LABEL_SPEC[String(label || "").trim().toLowerCase()] || D("all");

const PALETTE = ["#1e3a5f", "#0f766e", "#c2410c", "#b91c1c", "#1d4ed8", "#6d28d9", "#0e7490", "#3f6212"];

const numOf = (value) => {
  const n = parseFloat(String(value ?? "").replace(/[₹,%\s,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const shortLabel = (label, size = 12) => {
  const text = String(label || "");
  return text.length > size ? `${text.slice(0, size - 1)}…` : text;
};

function arcPath(cx, cy, r, start, end) {
  const sweep = end - start;
  if (sweep >= Math.PI * 2 - 0.001) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(start);
  const y0 = cy + r * Math.sin(start);
  const x1 = cx + r * Math.cos(end);
  const y1 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function ViewToggle({ value, onChange }) {
  return (
    <div className="ovViewToggle" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={value === "pie" ? "is-on" : ""} onClick={() => onChange("pie")}>Pie</button>
      <button type="button" className={value === "bar" ? "is-on" : ""} onClick={() => onChange("bar")}>Bar</button>
      <button type="button" className={value === "table" ? "is-on" : ""} onClick={() => onChange("table")}>Table</button>
    </div>
  );
}

function PieChart({ items, onItem }) {
  const draw = items.some((item) => item.value > 0) ? items.filter((item) => item.value > 0) : items;
  const total = draw.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const cx = 60;
  const cy = 60;
  const r = 52;
  let angle = -Math.PI / 2;
  const slices = total > 0
    ? draw.map((item, index) => {
        const start = angle;
        const end = angle + (item.value / total) * Math.PI * 2;
        angle = end;
        return { ...item, d: arcPath(cx, cy, r, start, end), color: item.color || PALETTE[index % PALETTE.length] };
      })
    : [];

  return (
    <div className="ovPie">
      <svg viewBox="0 0 120 120" role="img" aria-label="Pie chart">
        {slices.length ? slices.map((slice) => (
          <path
            key={slice.label}
            d={slice.d}
            fill={slice.color}
            stroke="#fff"
            strokeWidth="1.5"
            className={onItem && slice.label !== "Remainder" ? "ovSlice" : undefined}
            onClick={onItem && slice.label !== "Remainder" ? (e) => { e.stopPropagation(); onItem(slice); } : undefined}
          />
        )) : <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />}
      </svg>
      <ul className="ovLegend">
        {(slices.length ? slices : items).map((slice, index) => (
          <li key={slice.label}>
            <button
              type="button"
              onClick={onItem && slice.label !== "Remainder" ? (e) => { e.stopPropagation(); onItem(slice); } : undefined}
            >
              <i style={{ background: slice.color || PALETTE[index % PALETTE.length] }} />
              <span>{slice.label}</span>
              <b>{slice.display ?? slice.value}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnChart({ items, onItem }) {
  const width = 320;
  const height = 168;
  const padL = 28;
  const padR = 8;
  const padT = 16;
  const padB = 42;
  const max = Math.max(...items.map((item) => item.value), 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const gap = items.length > 6 ? 6 : 12;
  const barW = Math.max(8, (innerW - gap * Math.max(items.length - 1, 0)) / Math.max(items.length, 1));

  return (
    <svg className="ovCol" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart">
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#e2e8f0" />
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke="#e2e8f0" />
      <text x={padL - 4} y={padT + 4} textAnchor="end" className="ovCol__axis">{max >= 1000 ? `${Math.round(max / 1000)}k` : max}</text>
      <text x={padL - 4} y={padT + innerH} textAnchor="end" className="ovCol__axis">0</text>
      {items.map((item, index) => {
        const h = Math.max(item.value > 0 ? 3 : 0, (item.value / max) * innerH);
        const x = padL + index * (barW + gap);
        const y = padT + innerH - h;
        return (
          <g
            key={item.label}
            className={onItem && item.label !== "Remainder" ? "ovSlice" : undefined}
            onClick={onItem && item.label !== "Remainder" ? (e) => { e.stopPropagation(); onItem(item); } : undefined}
          >
            <rect x={x} y={y} width={barW} height={h} rx="3" fill={item.color || PALETTE[index % PALETTE.length]} />
            <text x={x + barW / 2} y={padT + innerH + 14} textAnchor="middle" className="ovCol__tick">{shortLabel(item.label, barW > 28 ? 12 : 8)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GroupedBars({ groups, onItem }) {
  const width = 320;
  const height = 168;
  const padL = 28;
  const padR = 8;
  const padT = 16;
  const padB = 42;
  const series = [
    { key: "onTime", name: "On time", color: "#047857" },
    { key: "delayed", name: "Delayed", color: "#b91c1c" },
  ];
  const max = Math.max(...groups.flatMap((group) => [group.onTime, group.delayed]), 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const slot = innerW / Math.max(groups.length, 1);
  const barW = Math.min(16, slot / 3);

  return (
    <svg className="ovCol" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grouped bar chart">
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke="#e2e8f0" />
      <text x={padL - 4} y={padT + 4} textAnchor="end" className="ovCol__axis">{max}</text>
      {groups.map((group, index) => {
        const x0 = padL + index * slot + (slot - barW * 2 - 4) / 2;
        return (
          <g key={group.label}>
            {series.map((item, seriesIndex) => {
              const value = group[item.key] || 0;
              const h = (value / max) * innerH;
              const x = x0 + seriesIndex * (barW + 4);
              const y = padT + innerH - h;
              return (
                <rect
                  key={item.key}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx="2"
                  fill={item.color}
                  className="ovSlice"
                  onClick={onItem ? (e) => { e.stopPropagation(); onItem({ ...group, label: group.label, display: value, series: item.name }); } : undefined}
                />
              );
            })}
            <text x={padL + index * slot + slot / 2} y={padT + innerH + 14} textAnchor="middle" className="ovCol__tick">{shortLabel(group.label, 10)}</text>
          </g>
        );
      })}
      <g className="ovCol__key">
        {series.map((item, index) => (
          <g key={item.key} transform={`translate(${padL + index * 78}, ${height - 12})`}>
            <rect width="8" height="8" rx="2" fill={item.color} />
            <text x="12" y="8" className="ovCol__tick">{item.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function ChartBoard({ mode, items, groups, onItem }) {
  if (!items.length) return <div className="ovBars__empty">No figures for this card</div>;
  return (
    <div className="ovCharts ovCharts--single" onClick={(e) => e.stopPropagation()}>
      {mode === "bar"
        ? (groups ? <GroupedBars groups={groups} onItem={onItem} /> : <ColumnChart items={items} onItem={onItem} />)
        : <PieChart items={items} onItem={onItem} />}
    </div>
  );
}

function Drill({ children, onClick }) {
  return (
    <button type="button" className="ovDrillLink" title="View details" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {children}
    </button>
  );
}

function SectionHead({ title, note, icon: Icon, onClick }) {
  return (
    <div className="ovSectionHead">
      <div
        className={`ovSectionHead__title${onClick ? " ovClickRow" : ""}`}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      >
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

function custMeta(row) {
  const parts = [];
  if (row.bpCode && row.bpCode !== "-") parts.push(`Code ${row.bpCode}`);
  if (row.bpId !== "" && row.bpId != null) parts.push(`ID ${row.bpId}`);
  if (row.locCode && row.locCode !== "-") parts.push(`Loc ${row.locCode}`);
  return parts.join(" · ");
}

function CustFig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {value}
    </button>
  );
}

function NameSort({ label, dir, onAsc, onDesc }) {
  return (
    <span className="ovNameSort">
      <span>{label}</span>
      <span className="ovNameSort__arrows">
        <button type="button" className={dir === "asc" ? "is-on" : ""} aria-label={`Sort ${label} A to Z`} onClick={onAsc}>▲</button>
        <button type="button" className={dir === "desc" ? "is-on" : ""} aria-label={`Sort ${label} Z to A`} onClick={onDesc}>▼</button>
      </span>
    </span>
  );
}

const byName = (rows, dir) => [...rows].sort((a, b) => {
  const cmp = String(a.name || "").trim().localeCompare(String(b.name || "").trim(), "en", { sensitivity: "base" });
  return dir === "desc" ? -cmp : cmp;
});

function CustomerTable({ rows, onOpen }) {
  const [nameDir, setNameDir] = useState("asc");
  const periods = [
    ["last", "Last month", "is-last"],
    ["month", "Current month", "is-month"],
    ["fy", "Up to FY", "is-fy"],
  ];
  const lanes = [["Ftl", "FTL"], ["Ptl", "PTL"]];
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const probe = el.scrollLeft;
    el.scrollLeft = 1;
    const moved = el.scrollLeft;
    el.scrollLeft = probe;
    const max = el.scrollWidth - el.clientWidth;
    if (moved === 0) el.scrollLeft = -max;
    else if (moved < 0) el.scrollLeft = -max;
    else el.scrollLeft = 0;
  }, [rows]);
  const figures = [
    ...periods.flatMap(([period]) => lanes.flatMap(([lane, laneLabel]) => [
      [`${period}${lane}Amt`, `${laneLabel} amount`],
      [`${period}${lane}Nos`, `${laneLabel} dockets`],
    ])),
    ["undelivered", "Undelivered dockets"],
    ["unbilled", "Unbilled dockets"],
    ["preparedNos", "Bills prepared"],
    ["preparedAmt", "Bills prepared amount"],
    ["submittedNos", "Bills submitted"],
    ["submittedAmt", "Bills submitted amount"],
    ["receiptNos", "Receipts"],
    ["receiptAmt", "Receipt amount"],
    ["os30", "Outstanding 0–30"],
    ["os60", "Outstanding 31–60"],
    ["os90", "Outstanding 61–90"],
    ["osOver", "Outstanding above 90"],
  ];
  return (
    <div className="ovCustScroll" ref={scrollRef}>
      <table className="ordMgmt ordMgmt--cust">
        <colgroup>
          <col className="ovCustCol" />
          {Array.from({ length: 24 }, (_, index) => <col key={index} className="ovCustFig" />)}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={3}>
              <NameSort label="Customer" dir={nameDir} onAsc={() => setNameDir("asc")} onDesc={() => setNameDir("desc")} />
            </th>
            {periods.map(([key, label, tone]) => (
              <th key={key} className={tone} colSpan={4}>{label}</th>
            ))}
            <th rowSpan={3} className="is-open">Undelivered</th>
            <th rowSpan={3} className="is-open">Unbilled</th>
            <th colSpan={2} rowSpan={2} className="is-bill">Bills prepared</th>
            <th colSpan={2} rowSpan={2} className="is-sub">Bills submitted</th>
            <th colSpan={2} rowSpan={2} className="is-receipt">Receipts</th>
            <th colSpan={4} rowSpan={2} className="is-os">Outstanding</th>
          </tr>
          <tr>
            {periods.flatMap(([period, , tone]) => lanes.map(([lane, label]) => (
              <th key={`${period}-${lane}`} className={tone} colSpan={2}>{label}</th>
            )))}
          </tr>
          <tr>
            {periods.flatMap(([period, , tone]) => lanes.flatMap(([lane]) => ["Amt", "Nos"].map((metric) => (
              <th key={`${period}-${lane}-${metric}`} className={tone}>{metric}</th>
            ))))}
            <th className="is-bill">Nos</th><th className="is-bill">Amt</th>
            <th className="is-sub">Nos</th><th className="is-sub">Amt</th>
            <th className="is-receipt">Nos</th><th className="is-receipt">Amt</th>
            <th className="is-os">0–30</th>
            <th className="is-os">31–60</th>
            <th className="is-os">61–90</th>
            <th className="is-os">Above 90</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? byName(rows, nameDir).map((row) => {
            const meta = custMeta(row);
            return (
              <tr key={`${row.bpId}-${row.name}`}>
                <td>
                  <span className="ovCustName" title={[row.name, meta].filter(Boolean).join(" · ")}>
                    <span className="ovAvatar">{initials(row.name)}</span>
                    <Drill onClick={() => onOpen(row, "name", "Bookings")}>{row.name}</Drill>
                    {meta ? <span className="ovCustName__meta">{meta}</span> : null}
                  </span>
                </td>
                {figures.map(([key, label]) => (
                  <td key={key}>
                    <CustFig value={row[key]} onClick={() => onOpen(row, key, label)} />
                  </td>
                ))}
              </tr>
            );
          }) : (
            <tr><td className="ordEmpty" colSpan={25}>No customers in this view</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function VendorTable({ rows, onOpen }) {
  const [nameDir, setNameDir] = useState("asc");
  const periods = [
    ["last", "Last month", "is-last"],
    ["month", "Current month", "is-month"],
    ["fy", "Current FY", "is-fy"],
  ];
  const tripCols = [
    ["OnTime", "ok", "On time"],
    ["Delayed", "late", "Delayed"],
    ["Safe", "ok", "Safe"],
    ["Remarked", "wait", "Remarked"],
    ["Trips", "plain", "Total"],
  ];
  const hireCols = [
    ["Hire", "plain", "Total"],
    ["Paid", "plain", "Paid"],
    ["Balance", "plain", "Balance"],
    ["Deductions", "plain", "Deductions"],
  ];
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const probe = el.scrollLeft;
    el.scrollLeft = 1;
    const moved = el.scrollLeft;
    el.scrollLeft = probe;
    const max = el.scrollWidth - el.clientWidth;
    if (moved === 0) el.scrollLeft = -max;
    else if (moved < 0) el.scrollLeft = -max;
    else el.scrollLeft = 0;
  }, [rows]);
  const figures = [
    ["engaged", "plain", "Vehicles"],
    ...periods.flatMap(([period, periodLabel]) => [
      ...tripCols.map(([key, tone, label]) => [`${period}${key}`, tone, `${periodLabel} trips · ${label}`]),
      ...hireCols.map(([key, tone, label]) => [`${period}${key}`, tone, `${periodLabel} hire · ${label}`]),
    ]),
    ["rating", "plain", "Rating"],
  ];
  return (
    <div className="ovCustScroll" ref={scrollRef}>
      <table className="ordMgmt ordMgmt--cust ordMgmt--vend">
        <colgroup>
          <col className="ovCustCol" />
          {Array.from({ length: figures.length }, (_, index) => <col key={index} className="ovCustFig" />)}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={3}>
              <NameSort label="Vendor" dir={nameDir} onAsc={() => setNameDir("asc")} onDesc={() => setNameDir("desc")} />
            </th>
            <th rowSpan={3} className="is-open">Vehicles</th>
            {periods.map(([key, label, tone]) => (
              <th key={key} className={tone} colSpan={9}>{label}</th>
            ))}
            <th rowSpan={3} className="is-os">Rating</th>
          </tr>
          <tr>
            {periods.flatMap(([period, , tone]) => [
              <th key={`${period}-trips`} className={tone} colSpan={5}>Trips</th>,
              <th key={`${period}-hire`} className={tone} colSpan={4}>Hire</th>,
            ])}
          </tr>
          <tr>
            {periods.flatMap(([period, , tone]) => [
              ...tripCols.map(([key, , label]) => (
                <th key={`${period}-${key}`} className={tone}>{label}</th>
              )),
              ...hireCols.map(([key, , label]) => (
                <th key={`${period}-${key}`} className={tone}>{label}</th>
              )),
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.length ? byName(rows, nameDir).map((row) => (
            <tr key={row.name}>
              <td>
                <span className="ovCustName" title={row.name}>
                  <span className="ovAvatar">{initials(row.name)}</span>
                  <Drill onClick={() => onOpen(row, "name", "Hire")}>{row.name}</Drill>
                </span>
              </td>
              {figures.map(([key, tone, label]) => (
                <td key={key}>
                  <CustFig value={row[key]} tone={tone} onClick={() => onOpen(row, key, label)} />
                </td>
              ))}
            </tr>
          )) : (
            <tr><td className="ordEmpty" colSpan={30}>No vendors in this view</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
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

export default function DashboardOverview({ data, loading = false }) {
  const overview = data || {};
  const [detail, setDetail] = useState(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orderStart, setOrderStart] = useState(null);
  const [orderLane, setOrderLane] = useState("both");
  const [despatchOpen, setDespatchOpen] = useState(false);
  const [despatchStart, setDespatchStart] = useState(null);
  const [despatchLane, setDespatchLane] = useState("both");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleStart, setVehicleStart] = useState(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryStart, setDeliveryStart] = useState(null);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [revenueStart, setRevenueStart] = useState(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionStart, setCollectionStart] = useState(null);
  const [outstandingOpen, setOutstandingOpen] = useState(false);
  const [outstandingStart, setOutstandingStart] = useState(null);
  const [hireOpen, setHireOpen] = useState(false);
  const [hireStart, setHireStart] = useState(null);
  const [ewbOpen, setEwbOpen] = useState(false);
  const [ewbStart, setEwbStart] = useState(null);
  const [views, setViews] = useState({});
  const [freshOrders, setFreshOrders] = useState(null);
  const [freshDespatches, setFreshDespatches] = useState(null);
  const [freshVehicles, setFreshVehicles] = useState(null);
  const [freshDeliveries, setFreshDeliveries] = useState(null);
  const [freshRevenue, setFreshRevenue] = useState(null);
  const [freshCollection, setFreshCollection] = useState(null);
  const [freshOutstanding, setFreshOutstanding] = useState(null);
  const [freshHire, setFreshHire] = useState(null);
  const [freshEwb, setFreshEwb] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchOrderBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshOrders(next); }).catch(() => {});
    fetchDespatchBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshDespatches(next); }).catch(() => {});
    fetchVehicleBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshVehicles(next); }).catch(() => {});
    fetchDeliveryBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshDeliveries(next); }).catch(() => {});
    fetchRevenueBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshRevenue(next); }).catch(() => {});
    fetchCollectionBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshCollection(next); }).catch(() => {});
    fetchOutstandingBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshOutstanding(next); }).catch(() => {});
    fetchHireBoard().then((next) => { if (!cancelled && next?.periods?.length) setFreshHire(next); }).catch(() => {});
    fetchEwbBoard().then((next) => { if (!cancelled && next?.rows?.length) setFreshEwb(next); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const viewOf = (key) => views[key] || "table";
  const setView = (key, mode) => setViews((prev) => ({ ...prev, [key]: mode }));
  const openDetail = (d) => setDetail(d);
  const closeDetail = () => setDetail(null);
  const openMetric = ({ section, label, value, accent, Icon, spec, preset }) => openDetail({
    section, label, value, accent: accent || "purple", Icon: Icon || "Insights",
    ...(spec || specForLabel(label)), preset,
  });
  const openSection = (title, Icon) => openMetric({
    section: title, label: title, value: "", accent: "purple", Icon, spec: SECTION_SPEC[title],
  });
  const openParty = (section, row, field, pretty) => {
    const vendor = section.startsWith("Vendor");
    const spec = vendor ? (VENDOR_SPEC[field] || VENDOR_SPEC.name) : (CUSTOMER_SPEC[field] || CUSTOMER_SPEC.name);
    openDetail({
      section,
      label: `${row.name} · ${pretty}`,
      value: row[field],
      accent: vendor ? "green" : "purple",
      Icon: vendor ? "Factory" : "Group",
      ...spec,
      preset: vendor ? { vendor: row.name } : { consignor: row.name },
    });
  };
  const customers = overview.customers || [];
  const vendors = overview.vendors || [];
  const orderBoard = freshOrders || overview.orders;
  const orderPeriods = orderBoard?.periods || [];
  const readStatus = (lane) => ({
    onTime: Number(lane?.onTime || 0),
    delay: Number(lane?.delay || 0),
    same: Number(lane?.pending?.same || 0),
    last: Number(lane?.pending?.last || 0),
    over: Number(lane?.pending?.over || 0),
    total: Number(lane?.total || 0),
  });
  const statusOf = (period, lane) => {
    if (lane === "FTL") return readStatus(period?.ftl);
    if (lane === "PTL") return readStatus(period?.ptl);
    const ftl = readStatus(period?.ftl);
    const ptl = readStatus(period?.ptl);
    return {
      onTime: ftl.onTime + ptl.onTime,
      delay: ftl.delay + ptl.delay,
      same: ftl.same + ptl.same,
      last: ftl.last + ptl.last,
      over: ftl.over + ptl.over,
      total: Number(period?.total || ftl.total + ptl.total),
    };
  };
  const todayStatus = statusOf(orderPeriods.find((period) => period.key === "today") || {}, orderLane);
  const fyOrder = statusOf(orderPeriods.find((period) => period.key === "fy") || {}, orderLane);
  const orderPie = [
    { label: "On time", value: fyOrder.onTime, color: "#047857", period: "fy", slice: "ontime" },
    { label: "Delayed", value: fyOrder.delay, color: "#b91c1c", period: "fy", slice: "delay" },
    { label: "Same day", value: fyOrder.same, color: "#1d4ed8", period: "fy", slice: "pend_same" },
    { label: "Last day", value: fyOrder.last, color: "#0f766e", period: "fy", slice: "pend_last" },
    { label: "> 2 days", value: fyOrder.over, color: "#c2410c", period: "fy", slice: "pend_over" },
  ].map((item) => ({ ...item, display: item.value }));
  const orderBars = orderPeriods.map((period, index) => {
    const status = statusOf(period, orderLane);
    return { label: period.label, value: status.total, display: status.total, color: PALETTE[index % PALETTE.length], period: period.key, slice: "all" };
  });
  const openOrderSlice = (period, slice) => {
    const lane = orderLane === "FTL" || orderLane === "PTL" ? orderLane : "all";
    setOrderStart({ period, slice, lane });
    setOrdersOpen(true);
  };
  const despatchBoard = freshDespatches || overview.despatches;
  const despatchPeriods = despatchBoard?.periods || [];
  const readSide = (side) => ({
    despatched: Number(side?.despatched || 0),
    undespatched: Number(side?.undespatched || 0),
    total: Number(side?.total || 0),
  });
  const readDespatch = (lane) => ({
    origin: readSide(lane?.origin),
    hub: readSide(lane?.hub),
    dest: readSide(lane?.dest),
    total: Number(lane?.total || 0),
  });
  const addSide = (a, b) => ({
    despatched: a.despatched + b.despatched,
    undespatched: a.undespatched + b.undespatched,
    total: a.total + b.total,
  });
  const despatchOf = (period, lane) => {
    if (lane === "FTL") return readDespatch(period?.ftl);
    if (lane === "PTL") return readDespatch(period?.ptl);
    const ftl = readDespatch(period?.ftl);
    const ptl = readDespatch(period?.ptl);
    return {
      origin: addSide(ftl.origin, ptl.origin),
      hub: addSide(ftl.hub, ptl.hub),
      dest: addSide(ftl.dest, ptl.dest),
      total: Number(period?.total || ftl.total + ptl.total),
    };
  };
  const todayDespatch = despatchOf(despatchPeriods.find((period) => period.key === "today") || {}, despatchLane);
  const fyDespatch = despatchOf(despatchPeriods.find((period) => period.key === "fy") || {}, despatchLane);
  const despatchPie = [
    { label: "From origin", value: fyDespatch.origin.total, color: "#1e3a5f", period: "fy", slice: "origin" },
    { label: "From hubs", value: fyDespatch.hub.total, color: "#0f766e", period: "fy", slice: "hub" },
    { label: "From destination", value: fyDespatch.dest.total, color: "#c2410c", period: "fy", slice: "dest" },
  ].map((item) => ({ ...item, display: item.value }));
  const despatchBars = despatchPeriods.map((period, index) => {
    const row = despatchOf(period, despatchLane);
    return { label: period.label, value: row.origin.total, display: row.origin.total, color: PALETTE[index % PALETTE.length], period: period.key, slice: "origin" };
  });
  const openDespatchSlice = (period, slice) => {
    const lane = despatchLane === "FTL" || despatchLane === "PTL" ? despatchLane : "all";
    setDespatchStart({ period, slice, lane });
    setDespatchOpen(true);
  };
  const vehicleBoard = freshVehicles || overview.vehicles;
  const deliveryBoard = freshDeliveries || overview.deliveries;
  const fyVehicle = (vehicleBoard?.periods || []).find((period) => period.key === "fy") || {};
  const vehiclePie = [
    { label: "Arrived on time", value: Number(fyVehicle.arrived?.on || 0), color: "#047857", period: "fy", slice: "arrived_on" },
    { label: "Arrived by 1 day", value: Number(fyVehicle.arrived?.d1 || 0), color: "#c2410c", period: "fy", slice: "arrived_d1" },
    { label: "Arrived by 2 days", value: Number(fyVehicle.arrived?.d2 || 0), color: "#b45309", period: "fy", slice: "arrived_d2" },
    { label: "Arrived > 2 days", value: Number(fyVehicle.arrived?.over || 0), color: "#b91c1c", period: "fy", slice: "arrived_over" },
    { label: "In transit on time", value: Number(fyVehicle.transit?.on || 0), color: "#1d4ed8", period: "fy", slice: "transit_on" },
    { label: "In transit by 1 day", value: Number(fyVehicle.transit?.d1 || 0), color: "#0f766e", period: "fy", slice: "transit_d1" },
    { label: "In transit by 2 days", value: Number(fyVehicle.transit?.d2 || 0), color: "#7c3aed", period: "fy", slice: "transit_d2" },
    { label: "In transit > 2 days", value: Number(fyVehicle.transit?.over || 0), color: "#9a3412", period: "fy", slice: "transit_over" },
  ].map((item) => ({ ...item, display: item.value }));
  const vehicleBars = (vehicleBoard?.periods || []).map((period, index) => {
    const total = Number(period.arrived?.total || 0) + Number(period.transit?.total || 0);
    return { label: period.label, value: total, display: total, color: PALETTE[index % PALETTE.length], period: period.key, slice: "all" };
  });
  const fyDelivery = (deliveryBoard?.periods || []).find((period) => period.key === "fy") || {};
  const deliveryPie = [
    { label: "Delivered on time", value: Number(fyDelivery.delivered?.on || 0), color: "#047857", period: "fy", slice: "delivered_on" },
    { label: "Delivered by 1 day", value: Number(fyDelivery.delivered?.d1 || 0), color: "#c2410c", period: "fy", slice: "delivered_d1" },
    { label: "Delivered by 2 days", value: Number(fyDelivery.delivered?.d2 || 0), color: "#b45309", period: "fy", slice: "delivered_d2" },
    { label: "Delivered > 2 days", value: Number(fyDelivery.delivered?.over || 0), color: "#b91c1c", period: "fy", slice: "delivered_over" },
    { label: "Undelivered same day", value: Number(fyDelivery.pending?.same || 0), color: "#1d4ed8", period: "fy", slice: "pending_same" },
    { label: "Undelivered last day", value: Number(fyDelivery.pending?.last || 0), color: "#0f766e", period: "fy", slice: "pending_last" },
    { label: "Undelivered 2 days", value: Number(fyDelivery.pending?.d2 || 0), color: "#7c3aed", period: "fy", slice: "pending_d2" },
    { label: "Undelivered > 2 days", value: Number(fyDelivery.pending?.over || 0), color: "#9a3412", period: "fy", slice: "pending_over" },
  ].map((item) => ({ ...item, display: item.value }));
  const deliveryBars = (deliveryBoard?.periods || []).map((period, index) => {
    const total = Number(period.delivered?.total || 0) + Number(period.pending?.total || 0);
    return { label: period.label, value: total, display: total, color: PALETTE[index % PALETTE.length], period: period.key, slice: "all" };
  });
  const vehicleMode = viewOf("Arrived and in transit");
  const deliveryMode = viewOf("Delivered dockets");
  const revenueBoard = freshRevenue || overview.revenue;
  const collectionBoard = freshCollection || overview.collection;
  const outstandingBoard = freshOutstanding || overview.outstanding;
  const hireBoard = freshHire || overview.hire;
  const ewbBoard = freshEwb || overview.ewb;
  const fyRevenue = (revenueBoard?.periods || []).find((period) => period.key === "fy") || {};
  const revenuePie = [
    { label: "To Pay", value: Number(fyRevenue.topay?.amount ?? fyRevenue.topay?.total ?? 0), color: "#047857", period: "fy", slice: "topay" },
    { label: "Paid", value: Number(fyRevenue.paid?.amount ?? fyRevenue.paid?.total ?? 0), color: "#0f766e", period: "fy", slice: "paid" },
    { label: "TBB billed", value: Number(fyRevenue.tbb?.billed || 0), color: "#1d4ed8", period: "fy", slice: "tbb_billed" },
    { label: "TBB unbilled", value: Number(fyRevenue.tbb?.unbilled || 0), color: "#b91c1c", period: "fy", slice: "tbb_unbilled" },
  ].map((item) => ({ ...item, display: `₹${item.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` }));
  const revenueBars = (revenueBoard?.periods || []).map((period, index) => {
    const total = Number(period.topay?.total || 0) + Number(period.paid?.total || 0) + Number(period.tbb?.total || 0);
    return { label: period.label, value: total, display: `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: PALETTE[index % PALETTE.length], period: period.key, slice: "all" };
  });
  const revenueMode = viewOf("Revenue");
  const monthMode = viewOf("Month wise");
  const monthBars = (revenueBoard?.months || []).map((month, index) => ({
    label: month.label,
    value: Number(month.total || 0),
    display: `₹${Number(month.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    color: PALETTE[index % PALETTE.length],
    period: month.key,
    slice: "all",
  }));
  const orderMode = viewOf("Order Management");
  const despatchMode = viewOf("Despatch Management");

  return (
    <div>
      <SectionHead title="Executive Overview" note="Operational snapshot" icon={Insights} onClick={() => openSection("Executive Overview", "Insights")} />
      <div className="ovMgmtRow">
      <section className="ovOrderPanel">
        <div className="ovOrderPanel__top">
          <span className="ovKpiCard__icon" style={{ background: "#1e293b", color: "#fff" }}>
            <ShoppingBag style={{ fontSize: 16 }} />
          </span>
          <div className="ovOrderPanel__title">
            <h3>Order Management</h3>
            <p>
              Today{orderLane === "both" ? "" : ` · ${orderLane}`} · {(todayStatus.onTime + todayStatus.delay).toLocaleString("en-IN")} placed
              · {(todayStatus.same + todayStatus.last + todayStatus.over).toLocaleString("en-IN")} pending pickup
            </p>
          </div>
          <div className="ordLanePick" role="radiogroup" aria-label="Lane">
            {[["both", "Both"], ["FTL", "FTL"], ["PTL", "PTL"]].map(([value, label]) => (
              <label key={value} className={orderLane === value ? "is-on" : ""}>
                <input type="radio" name="order-lane" value={value} checked={orderLane === value} onChange={() => setOrderLane(value)} />
                {label}
              </label>
            ))}
          </div>
          <ViewToggle value={orderMode} onChange={(mode) => setView("Order Management", mode)} />
        </div>
        {loading && !orderBoard ? <LoadingBar width="100%" /> : orderMode === "table" ? (
          <OrderManagementBoard board={orderBoard} lane={orderLane} onSlice={openOrderSlice} />
        ) : (
          <ChartBoard mode={orderMode} items={orderMode === "bar" ? orderBars : orderPie} onItem={(item) => openOrderSlice(item.period, item.slice || "all")} />
        )}
      </section>
      <section className="ovOrderPanel ovOrderPanel--pair">
        <div className="ovOrderPanel__top">
          <span className="ovKpiCard__icon" style={{ background: "#1e3a5f", color: "#fff" }}>
            <LocalShipping style={{ fontSize: 16 }} />
          </span>
          <div className="ovOrderPanel__title">
            <h3>Despatch Management</h3>
            <p>
              Today{despatchLane === "both" ? "" : ` · ${despatchLane}`} · From origin · {todayDespatch.origin.despatched.toLocaleString("en-IN")} despatched
              · {todayDespatch.origin.undespatched.toLocaleString("en-IN")} undespatched
            </p>
          </div>
          <div className="ordLanePick" role="radiogroup" aria-label="Despatch lane">
            {[["both", "Both"], ["FTL", "FTL"], ["PTL", "PTL"]].map(([value, label]) => (
              <label key={value} className={despatchLane === value ? "is-on" : ""}>
                <input type="radio" name="despatch-lane" value={value} checked={despatchLane === value} onChange={() => setDespatchLane(value)} />
                {label}
              </label>
            ))}
          </div>
          <ViewToggle value={despatchMode} onChange={(mode) => setView("Despatch Management", mode)} />
        </div>
        {loading && !despatchBoard ? <LoadingBar width="100%" /> : despatchMode === "table" ? (
          <DespatchManagementBoard board={despatchBoard} lane={despatchLane} onSlice={openDespatchSlice} />
        ) : (
          <ChartBoard mode={despatchMode} items={despatchMode === "bar" ? despatchBars : despatchPie} onItem={(item) => openDespatchSlice(item.period, item.slice || "all")} />
        )}
      </section>
      </div>
      <div className="ovMgmtRow ovMgmtRow--half">
        <section className="ovOrderPanel">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#0f3d3e", color: "#fff" }}>
              <AirportShuttle style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>Arrived and in transit</h3>
              <p>{vehicleBoard?.fyLabel || "This FY"} · manifests with a vehicle</p>
            </div>
            <ViewToggle value={vehicleMode} onChange={(mode) => setView("Arrived and in transit", mode)} />
          </div>
          {loading && !vehicleBoard ? <LoadingBar width="100%" /> : vehicleMode === "table" ? (
            <VehicleBoard board={vehicleBoard} onSlice={(period, slice) => { setVehicleStart({ period, slice }); setVehicleOpen(true); }} />
          ) : (
            <ChartBoard mode={vehicleMode} items={vehicleMode === "bar" ? vehicleBars : vehiclePie} onItem={(item) => { setVehicleStart({ period: item.period, slice: item.slice }); setVehicleOpen(true); }} />
          )}
        </section>
        <section className="ovOrderPanel">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#047857", color: "#fff" }}>
              <AssignmentTurnedIn style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>Delivered dockets</h3>
              <p>{deliveryBoard?.fyLabel || "This FY"} · delivery against destination arrival</p>
            </div>
            <ViewToggle value={deliveryMode} onChange={(mode) => setView("Delivered dockets", mode)} />
          </div>
          {loading && !deliveryBoard ? <LoadingBar width="100%" /> : deliveryMode === "table" ? (
            <DeliveryBoard board={deliveryBoard} onSlice={(period, slice) => { setDeliveryStart({ period, slice }); setDeliveryOpen(true); }} />
          ) : (
            <ChartBoard mode={deliveryMode} items={deliveryMode === "bar" ? deliveryBars : deliveryPie} onItem={(item) => { setDeliveryStart({ period: item.period, slice: item.slice }); setDeliveryOpen(true); }} />
          )}
        </section>
      </div>
      <div className="ovMgmtRow ovMgmtRow--rev">
        <div className="ovRevStack">
          <section className="ovOrderPanel">
            <div className="ovOrderPanel__top">
              <span className="ovKpiCard__icon" style={{ background: "#1e3a5f", color: "#fff" }}>
                <AccountBalanceWallet style={{ fontSize: 16 }} />
              </span>
              <div className="ovOrderPanel__title">
                <h3>Revenue</h3>
                <p>{revenueBoard?.fyLabel || "This FY"} · To Pay, Paid and TBB</p>
              </div>
              <ViewToggle value={revenueMode} onChange={(mode) => setView("Revenue", mode)} />
            </div>
            {loading && !revenueBoard ? <LoadingBar width="100%" /> : revenueMode === "table" ? (
              <RevenueBoard board={revenueBoard} onSlice={(period, slice) => { setRevenueStart({ period, slice }); setRevenueOpen(true); }} />
            ) : (
              <ChartBoard mode={revenueMode} items={revenueMode === "bar" ? revenueBars : revenuePie} onItem={(item) => { setRevenueStart({ period: item.period, slice: item.slice }); setRevenueOpen(true); }} />
            )}
          </section>
          <section className="ovOrderPanel">
            <div className="ovOrderPanel__top">
              <span className="ovKpiCard__icon" style={{ background: "#047857", color: "#fff" }}>
                <ReceiptLong style={{ fontSize: 16 }} />
              </span>
              <div className="ovOrderPanel__title">
                <h3>Collection</h3>
                <p>{collectionBoard?.fyLabel || "This FY"} · bills and receipts</p>
              </div>
            </div>
            {loading && !collectionBoard ? <LoadingBar width="100%" /> : (
              <CollectionBoard board={collectionBoard} onSlice={(period, slice) => { setCollectionStart({ period, slice }); setCollectionOpen(true); }} />
            )}
          </section>
        </div>
        <section className="ovOrderPanel ovMonthCard">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#1e3a5f", color: "#fff" }}>
              <AccountBalanceWallet style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>Month wise</h3>
              <p>{revenueBoard?.fyLabel || "This FY"} · dockets and amount by month</p>
            </div>
            <ViewToggle value={monthMode} onChange={(mode) => setView("Month wise", mode)} />
          </div>
          {loading && !revenueBoard ? <LoadingBar width="100%" /> : monthMode === "table" ? (
            <RevenueMonths board={revenueBoard} onSlice={(period, slice) => { setRevenueStart({ period, slice }); setRevenueOpen(true); }} />
          ) : (
            <ChartBoard mode={monthMode} items={monthBars} onItem={(item) => { setRevenueStart({ period: item.period, slice: item.slice }); setRevenueOpen(true); }} />
          )}
        </section>
      </div>
      <div className="ovMgmtRow ovMgmtRow--rev ovMgmtRow--tail">
        <section className="ovOrderPanel">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#b45309", color: "#fff" }}>
              <Receipt style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>Outstanding breakup</h3>
              <p>{outstandingBoard?.fyLabel || "This FY"} · age from invoice date</p>
            </div>
          </div>
          {loading && !outstandingBoard ? <LoadingBar width="100%" /> : (
            <OutstandingBoard board={outstandingBoard} onSlice={(period, slice) => { setOutstandingStart({ period, slice }); setOutstandingOpen(true); }} />
          )}
        </section>
        <section className="ovOrderPanel">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#1e3a5f", color: "#fff" }}>
              <LocalShipping style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>Lorry hire</h3>
              <p>{hireBoard?.fyLabel || "This FY"} · nos and amount</p>
            </div>
          </div>
          {loading && !hireBoard ? <LoadingBar width="100%" /> : (
            <HireBoard board={hireBoard} onSlice={(period, slice) => { setHireStart({ period, slice }); setHireOpen(true); }} />
          )}
        </section>
        <section className="ovOrderPanel">
          <div className="ovOrderPanel__top">
            <span className="ovKpiCard__icon" style={{ background: "#b91c1c", color: "#fff" }}>
              <EventBusy style={{ fontSize: 16 }} />
            </span>
            <div className="ovOrderPanel__title">
              <h3>E-way bill expiry</h3>
              <p>Delivered and undelivered</p>
            </div>
          </div>
          {loading && !ewbBoard ? <LoadingBar width="100%" /> : (
            <EwbBoard board={ewbBoard} onSlice={(slice, side) => { setEwbStart({ slice, side }); setEwbOpen(true); }} />
          )}
        </section>
      </div>
      <section className="ovOrderPanel ovCustCard">
        <div className="ovOrderPanel__top">
          <span className="ovKpiCard__icon" style={{ background: "#1e293b", color: "#fff" }}>
            <Group style={{ fontSize: 16 }} />
          </span>
          <div className="ovOrderPanel__title">
            <h3 className="ovClickRow" onClick={() => openSection("Customer Wise Analysis", "Group")}>Customer Wise Analysis</h3>
            <p>{customers.length.toLocaleString("en-IN")} customers · last month, current month and up to FY</p>
          </div>
          <ViewToggle value={viewOf("customers")} onChange={(mode) => setView("customers", mode)} />
        </div>
        {loading && !customers.length ? <LoadingBar width="100%" /> : viewOf("customers") === "table" ? (
          <CustomerTable rows={customers} onOpen={(row, field, label) => openParty("Customer Wise Analysis", row, field, label)} />
        ) : (
          <ChartBoard
            mode={viewOf("customers")}
            items={[...customers]
              .sort((a, b) => numOf(b.total) - numOf(a.total))
              .slice(0, 8)
              .map((r, index) => ({ label: r.name, value: numOf(r.total), display: r.totalLabel || r.total, color: PALETTE[index % PALETTE.length] }))}
            onItem={(item) => {
              const row = customers.find((r) => r.name === item.label);
              if (row) openParty("Customer Wise Analysis", row, "total", "Total Bkg");
            }}
          />
        )}
      </section>

      <section className="ovOrderPanel ovCustCard">
        <div className="ovOrderPanel__top">
          <span className="ovKpiCard__icon" style={{ background: "#1e3a5f", color: "#fff" }}>
            <Factory style={{ fontSize: 16 }} />
          </span>
          <div className="ovOrderPanel__title">
            <h3 className="ovClickRow" onClick={() => openSection("Vendor Wise Analysis", "Factory")}>Vendor Wise Analysis</h3>
            <p>{vendors.length.toLocaleString("en-IN")} vendors · last month, current month and current FY</p>
          </div>
          <ViewToggle value={viewOf("vendors")} onChange={(mode) => setView("vendors", mode)} />
        </div>
        {loading && !vendors.length ? <LoadingBar width="100%" /> : viewOf("vendors") === "table" ? (
          <VendorTable rows={vendors} onOpen={(row, field, label) => openParty("Vendor Wise Analysis", row, field, label)} />
        ) : (
          <ChartBoard
            mode={viewOf("vendors")}
            items={[...vendors]
              .sort((a, b) => numOf(b.total) - numOf(a.total))
              .slice(0, 8)
              .map((r, index) => ({ label: r.name, value: numOf(r.total), display: r.fyHire, color: PALETTE[index % PALETTE.length] }))}
            onItem={(item) => {
              const row = vendors.find((r) => r.name === item.label);
              if (row) openParty("Vendor Wise Analysis", row, "fyHire", "Current FY hire");
            }}
          />
        )}
      </section>


      {ordersOpen && (
        <OrderDrill key={orderStart ? `${orderStart.period}-${orderStart.slice}-${orderStart.lane || "both"}` : "board"} open start={orderStart} onClose={() => setOrdersOpen(false)} />
      )}
      {despatchOpen && (
        <DespatchDrill key={despatchStart ? `${despatchStart.period}-${despatchStart.slice}-${despatchStart.lane || "both"}` : "board"} open start={despatchStart} onClose={() => setDespatchOpen(false)} />
      )}
      {vehicleOpen && (
        <VehicleDrill key={vehicleStart ? `${vehicleStart.period}-${vehicleStart.slice}` : "board"} open start={vehicleStart} onClose={() => setVehicleOpen(false)} />
      )}
      {deliveryOpen && (
        <DeliveryDrill key={deliveryStart ? `${deliveryStart.period}-${deliveryStart.slice}` : "board"} open start={deliveryStart} onClose={() => setDeliveryOpen(false)} />
      )}
      {revenueOpen && (
        <RevenueDrill key={revenueStart ? `${revenueStart.period}-${revenueStart.slice}` : "board"} open start={revenueStart} onClose={() => setRevenueOpen(false)} />
      )}
      {collectionOpen && (
        <CollectionDrill key={collectionStart ? `${collectionStart.period}-${collectionStart.slice}` : "all"} open start={collectionStart} onClose={() => setCollectionOpen(false)} />
      )}
      {outstandingOpen && (
        <OutstandingDrill key={outstandingStart ? `${outstandingStart.period}-${outstandingStart.slice}` : "total"} open start={outstandingStart} onClose={() => setOutstandingOpen(false)} />
      )}
      {hireOpen && (
        <HireDrill key={hireStart ? `${hireStart.period}-${hireStart.slice}` : "hire"} open start={hireStart} onClose={() => setHireOpen(false)} />
      )}
      {ewbOpen && (
        <EwbDrill key={ewbStart ? `${ewbStart.slice}-${ewbStart.side}` : "today"} open start={ewbStart} onClose={() => setEwbOpen(false)} />
      )}
      <ExecutiveKpiPopup
        key={`${detail?.section || ""}|${detail?.label || "closed"}`}
        open={Boolean(detail)}
        detail={detail}
        onClose={closeDetail}
      />
    </div>
  );
}
