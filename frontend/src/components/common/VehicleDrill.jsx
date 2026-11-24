import { useEffect, useState } from "react";
import { Dialog, DialogContent, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchVehicleBoard, fetchVehicleTrips } from "../../utils/dashboard";

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

const EMPTY_SIDE = { on: 0, d1: 0, d2: 0, over: 0, total: 0 };

const statusText = (stage, bucket) => {
  const where = stage === "transit" ? "In transit" : "Arrived";
  const when = bucket === "on" ? "on time" : bucket === "d1" ? "by 1 day" : bucket === "d2" ? "by 2 days" : "by > 2 days";
  return `${where} · ${when}`;
};

const PERIOD_LABEL = { today: "Today", week: "Last 7 days", month: "This month", fy: "This FY" };

const sliceLabel = (slice) => {
  if (slice === "all") return "Arrived and in transit";
  if (slice === "arrived") return "Arrived";
  if (slice === "transit") return "In transit";
  const [stage, bucket] = String(slice || "").split("_");
  return statusText(stage, bucket);
};

function Fig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {fmt(value)}
    </button>
  );
}

function PeriodTable({ title, stage, periods, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">{title}</div>
      <table className="ordMgmt vehBoard">
        <thead>
          <tr>
            <th>Period</th>
            <th>On<br />time</th>
            <th>By 1<br />day</th>
            <th>By 2<br />days</th>
            <th>&gt; 2<br />days</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const side = period[stage] || EMPTY_SIDE;
            const open = (bucket) => onSlice(period.key, bucket === "all" ? stage : `${stage}_${bucket}`);
            return (
              <tr key={`${stage}-${period.key}`}>
                <td>{period.label}</td>
                <td><Fig tone="ok" value={side.on} onClick={() => open("on")} /></td>
                <td><Fig tone="late" value={side.d1} onClick={() => open("d1")} /></td>
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

export function VehicleBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  return (
    <div className="ordPair">
      <PeriodTable title="Arrived" stage="arrived" periods={periods} onSlice={onSlice} />
      <PeriodTable title="In transit" stage="transit" periods={periods} onSlice={onSlice} />
    </div>
  );
}

const downloadTrips = (title, rows) => {
  const headers = ["Sr No", "Manifest", "Vehicle", "From", "To", "Manifest date", "Expected", "Arrival", "Status"];
  const body = rows.map((row, index) => [
    index + 1,
    `${row.mnf_loc || ""}/${row.mnf_no || ""}`,
    row.vehicle_no || "",
    `${row.mnf_loc || ""}${row.mnf_from_town ? ` · ${row.mnf_from_town}` : ""}`,
    `${row.mnf_to_loc || ""}${row.mnf_to_town ? ` · ${row.mnf_to_town}` : ""}`,
    showDate(row.mnf_date),
    showDate(row.exp_date),
    showDate(row.arr_date),
    statusText(row.stage, row.bucket),
  ]);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Vehicles">
<Table>
<Row>${excelCell(title || "Vehicle trips")}</Row>
<Row>${headers.map((label) => excelCell(label)).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => excelCell(value)).join("")}</Row>`).join("")}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vehicle-trips.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function VehicleDrill({ open, onClose, start = null }) {
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
    fetchVehicleBoard()
      .then((next) => { if (!cancelled) setBoard(next); })
      .catch(() => { if (!cancelled) setError("Vehicles could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (openOnList) {
      fetchVehicleTrips({ period: start.period || "fy", slice: start.slice })
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
    fetchVehicleTrips({ period, slice })
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setListError("This list could not be loaded."))
      .finally(() => setListLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Vehicles</div>
          <h2>{focus ? focus.title : "Arrived and in transit"}</h2>
          <p>
            {board?.fyLabel || "This FY"} from {showDate(board?.fyStart) || "1 Apr"} to {showDate(board?.asOf) || "today"}.
            Each figure is a manifest with a vehicle. Today, Last 7 days, This month, and This FY for arrived follow the arrival date, and for in transit they follow the manifest date.
            On time means arrival is on or before the manifest date plus the route transit days. In transit uses today in place of the arrival.
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
        {loading && screen === "board" ? <div className="ordState"><CircularProgress size={22} /> Loading vehicles</div>
          : error ? <div className="ordState">{error}</div>
            : screen === "board" ? <VehicleBoard board={board} onSlice={openSlice} />
              : listLoading ? <div className="ordState"><CircularProgress size={22} /> Loading trips</div>
                : listError ? <div className="ordState">{listError}</div>
                  : (
                    <div className="ordListWrap">
                      <div className="ordListBar">
                        <div className="ordListMeta">{fmt(rows.length)} trip{rows.length === 1 ? "" : "s"}{rows.length === 1000 ? " · first 1,000" : ""}</div>
                        <button type="button" className="ordBack" disabled={!rows.length} onClick={() => downloadTrips(focus?.title, rows)}>Export to Excel</button>
                      </div>
                      <table className="ordList">
                        <thead>
                          <tr>
                            <th>Sr No</th>
                            <th>Manifest</th>
                            <th>Vehicle</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Manifest date</th>
                            <th>Expected</th>
                            <th>Arrival</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 && (
                            <tr><td colSpan={9} className="ordEmpty">No trips in this slice</td></tr>
                          )}
                          {rows.map((row, index) => (
                            <tr key={`${row.mnf_loc}-${row.mnf_no}-${row.mnf_date}`}>
                              <td>{index + 1}</td>
                              <td>{row.mnf_loc}/{row.mnf_no}</td>
                              <td>{row.vehicle_no}</td>
                              <td>{row.mnf_loc}{row.mnf_from_town ? ` · ${row.mnf_from_town}` : ""}</td>
                              <td>{row.mnf_to_loc}{row.mnf_to_town ? ` · ${row.mnf_to_town}` : ""}</td>
                              <td>{showDate(row.mnf_date)}</td>
                              <td>{showDate(row.exp_date)}</td>
                              <td>{showDate(row.arr_date)}</td>
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
