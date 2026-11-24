import { useEffect, useState } from "react";
import { Dialog, DialogContent, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchDeliveryBoard, fetchDeliveryDockets } from "../../utils/dashboard";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const showDate = (iso) => {
  const text = String(iso || "").slice(0, 10);
  if (text.length < 10) return "";
  const [y, m, d] = text.split("-");
  return `${d}-${m}-${y}`;
};

const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const excelCell = (value) => `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;

const EMPTY_DELIVERED = { on: 0, d1: 0, d2: 0, over: 0, total: 0, nopod: 0 };
const EMPTY_PENDING = { same: 0, last: 0, d2: 0, over: 0, total: 0 };

const statusText = (stage, bucket) => {
  if (stage === "pending") {
    const when = bucket === "same" ? "same day" : bucket === "last" ? "last day" : bucket === "d2" ? "2 days" : "> 2 days";
    return `Arrived · undelivered · ${when}`;
  }
  const when = bucket === "on" ? "on time" : bucket === "d1" ? "late by 1 day" : bucket === "d2" ? "late by 2 days" : "late by > 2 days";
  return `Delivered · ${when}`;
};

const PERIOD_LABEL = { today: "Today", week: "Last 7 days", month: "This month", fy: "This FY" };

const sliceLabel = (slice) => {
  if (slice === "all") return "Delivered dockets";
  if (slice === "delivered") return "Delivered";
  if (slice === "delivered_nopod") return "Delivered without POD";
  if (slice === "pending") return "Arrived and undelivered";
  const stage = String(slice || "").startsWith("pending") ? "pending" : "delivered";
  const bucket = String(slice || "").slice(stage.length + 1);
  return statusText(stage, bucket);
};

function Fig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {fmt(value)}
    </button>
  );
}

function DeliveredTable({ periods, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">Delivered</div>
      <table className="ordMgmt">
        <thead>
          <tr>
            <th>Period</th>
            <th>On<br />time</th>
            <th>Late<br />1 day</th>
            <th>Late<br />2 days</th>
            <th>&gt; 2<br />days</th>
            <th>Total</th>
            <th>Without<br />POD</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const side = period.delivered || EMPTY_DELIVERED;
            const open = (bucket) => onSlice(period.key, bucket === "all" ? "delivered" : `delivered_${bucket}`);
            return (
              <tr key={`delivered-${period.key}`}>
                <td>{period.label}</td>
                <td><Fig tone="ok" value={side.on} onClick={() => open("on")} /></td>
                <td><Fig tone="late" value={side.d1} onClick={() => open("d1")} /></td>
                <td><Fig tone="late" value={side.d2} onClick={() => open("d2")} /></td>
                <td><Fig tone="late" value={side.over} onClick={() => open("over")} /></td>
                <td className="ordMgmt__sum"><Fig value={side.total} onClick={() => open("all")} /></td>
                <td><Fig tone="late" value={side.nopod} onClick={() => open("nopod")} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PendingTable({ periods, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">Arrived and undelivered</div>
      <table className="ordMgmt">
        <thead>
          <tr>
            <th>Period</th>
            <th>Same<br />day</th>
            <th>Last<br />day</th>
            <th>2<br />days</th>
            <th>&gt; 2<br />days</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const side = period.pending || EMPTY_PENDING;
            const open = (bucket) => onSlice(period.key, bucket === "all" ? "pending" : `pending_${bucket}`);
            return (
              <tr key={`pending-${period.key}`}>
                <td>{period.label}</td>
                <td><Fig tone="late" value={side.same} onClick={() => open("same")} /></td>
                <td><Fig tone="late" value={side.last} onClick={() => open("last")} /></td>
                <td><Fig tone="late" value={side.d2} onClick={() => open("d2")} /></td>
                <td><Fig tone="late" value={side.over} onClick={() => open("over")} /></td>
                <td className="ordMgmt__sum"><Fig value={side.total} onClick={() => open("all")} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DeliveryBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  return (
    <div className="ordPair">
      <DeliveredTable periods={periods} onSlice={onSlice} />
      <PendingTable periods={periods} onSlice={onSlice} />
    </div>
  );
}

const downloadDockets = (title, rows) => {
  const headers = ["Sr No", "Docket", "Scheduled date", "Arrival", "Delivery date", "Lane", "From", "To", "Consignor", "Consignee", "Pkgs", "Weight", "Status"];
  const body = rows.map((row, index) => [
    index + 1,
    row.docket_no || "",
    showDate(row.docket_date),
    showDate(row.dest_arr),
    showDate(row.dly_date),
    row.lane || "",
    `${row.docket_loc || ""}${row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}`,
    `${row.docket_to_loc || ""}${row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}`,
    row.cnor_name || "",
    row.cnee_name || "",
    row.docket_tot_pkgs ?? "",
    row.docket_act_wt ?? "",
    statusText(row.stage, row.bucket),
  ]);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Deliveries">
<Table>
<Row>${excelCell(title || "Delivery dockets")}</Row>
<Row>${headers.map((label) => excelCell(label)).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => excelCell(value)).join("")}</Row>`).join("")}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "delivery-dockets.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function DeliveryDrill({ open, onClose, start = null }) {
  const openOnList = Boolean(start?.slice);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState(openOnList ? "list" : "board");
  const [focus, setFocus] = useState(openOnList ? {
    title: `${PERIOD_LABEL[start.period] || start.period} · ${sliceLabel(start.slice)}`,
    period: start.period || "fy",
  } : null);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(openOnList);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchDeliveryBoard()
      .then((next) => { if (!cancelled) setBoard(next); })
      .catch(() => { if (!cancelled) setError("Deliveries could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (openOnList) {
      fetchDeliveryDockets({ period: start.period || "fy", slice: start.slice })
        .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setListError("This list could not be loaded."); })
        .finally(() => { if (!cancelled) setListLoading(false); });
    }
    return () => { cancelled = true; };
  }, [openOnList, start?.period, start?.slice]);

  const periodLabel = (key) => board?.periods?.find((item) => item.key === key)?.label || key;

  const openSlice = (period, slice) => {
    setFocus({ title: `${periodLabel(period)} · ${sliceLabel(slice)}`, period });
    setScreen("list");
    setListLoading(true);
    setListError("");
    fetchDeliveryDockets({ period, slice })
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setListError("This list could not be loaded."))
      .finally(() => setListLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Deliveries</div>
          <h2>{focus ? focus.title : "Delivered dockets"}</h2>
          <p>
            {board?.fyLabel || "This FY"} from {showDate(board?.fyStart) || "1 Apr"} to {showDate(board?.asOf) || "today"}.
            Delivered periods follow the delivery date. Arrived and undelivered periods follow the unloading arrival at the destination.
            On time means the delivery date is on or before that arrival. When no destination unloading is recorded, the docket date is used.
            Without POD counts delivered dockets whose latest delivery note has neither a front nor a back POD.
            Arrived and undelivered means the goods reached the destination and the delivery has not been updated.
          </p>
        </div>
        <div className="ordHead__actions">
          {screen === "list" && (
            <button type="button" className="ordBack" onClick={() => { setFocus(null); setScreen("board"); }}>
              <ArrowBackIcon style={{ fontSize: 16 }} /> Back
            </button>
          )}
          <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
        </div>
      </div>
      <DialogContent>
        {loading && screen === "board" ? <div className="ordState"><CircularProgress size={22} /> Loading deliveries</div>
          : error ? <div className="ordState">{error}</div>
            : screen === "board" ? <DeliveryBoard board={board} onSlice={openSlice} />
              : listLoading ? <div className="ordState"><CircularProgress size={22} /> Loading dockets</div>
                : listError ? <div className="ordState">{listError}</div>
                  : (
                    <div className="ordListWrap">
                      <div className="ordListBar">
                        <div className="ordListMeta">{fmt(rows.length)} docket{rows.length === 1 ? "" : "s"}{rows.length === 1000 ? " · first 1,000" : ""}</div>
                        <button type="button" className="ordBack" disabled={!rows.length} onClick={() => downloadDockets(focus?.title, rows)}>Export to Excel</button>
                      </div>
                      <table className="ordList">
                        <thead>
                          <tr>
                            <th>Sr No</th>
                            <th>Docket</th>
                            <th>Scheduled date</th>
                            <th>Arrival</th>
                            <th>Delivery date</th>
                            <th>Lane</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Consignor</th>
                            <th>Consignee</th>
                            <th>Pkgs</th>
                            <th>Weight</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 && (
                            <tr><td colSpan={13} className="ordEmpty">No dockets in this slice</td></tr>
                          )}
                          {rows.map((row, index) => (
                            <tr key={row.docket_no}>
                              <td>{index + 1}</td>
                              <td>{row.docket_no}</td>
                              <td>{showDate(row.docket_date)}</td>
                              <td>{showDate(row.dest_arr)}</td>
                              <td>{showDate(row.dly_date)}</td>
                              <td>{row.lane}</td>
                              <td>{row.docket_loc}{row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}</td>
                              <td>{row.docket_to_loc}{row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}</td>
                              <td>{row.cnor_name}</td>
                              <td>{row.cnee_name}</td>
                              <td>{row.docket_tot_pkgs}</td>
                              <td>{row.docket_act_wt}</td>
                              <td>{statusText(row.stage, row.bucket)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
      </DialogContent>
    </Dialog>
  );
}
