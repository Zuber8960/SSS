import { useEffect, useState } from "react";
import { Dialog, DialogContent, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchDespatchBoard, fetchDespatchDockets } from "../../utils/dashboard";

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

const BUCKETS = [
  ["same", "Same day"],
  ["next", "Next day"],
  ["after", "After 2 days"],
  ["d1", "1 day"],
  ["d2", "2 days"],
  ["over", "> 2 days"],
];

const SENT = ["same", "next", "after"];
const WAIT = ["d1", "d2", "over"];

const sourceName = (source) => (
  source === "hub" ? "From hubs" : source === "dest" ? "From destination" : "From origin"
);

const statusText = (source, bucket) => {
  const where = sourceName(source);
  const sent = SENT.includes(bucket);
  const when = BUCKETS.find(([key]) => key === bucket)?.[1] || bucket;
  return `${where} · ${sent ? "despatched" : "undespatched"} · ${when}`;
};

const SLICE_SPEC = {
  origin: { source: "origin" },
  hub: { source: "hub" },
  dest: { source: "dest" },
  origin_sent: { source: "origin", buckets: SENT },
  origin_wait: { source: "origin", buckets: WAIT },
  hub_sent: { source: "hub", buckets: SENT },
  hub_wait: { source: "hub", buckets: WAIT },
  dest_sent: { source: "dest", buckets: SENT },
  dest_wait: { source: "dest", buckets: WAIT },
};
BUCKETS.forEach(([bucket]) => {
  SLICE_SPEC[`origin_${bucket}`] = { source: "origin", bucket };
  SLICE_SPEC[`hub_${bucket}`] = { source: "hub", bucket };
  SLICE_SPEC[`dest_${bucket}`] = { source: "dest", bucket };
});

const sliceLabel = (slice) => {
  if (!slice || slice === "all") return "All dockets";
  const spec = SLICE_SPEC[slice];
  if (!spec) return slice;
  if (!spec.bucket && !spec.buckets) return sourceName(spec.source);
  if (spec.buckets === SENT) return `${sourceName(spec.source)} · despatched`;
  if (spec.buckets === WAIT) return `${sourceName(spec.source)} · undespatched`;
  return statusText(spec.source, spec.bucket);
};

const matchesDespatchRow = (row, slice) => {
  if (!slice || slice === "all") return true;
  const spec = SLICE_SPEC[slice];
  if (!spec) return true;
  if (row?.source !== spec.source) return false;
  if (spec.bucket) return row.bucket === spec.bucket;
  if (spec.buckets) return spec.buckets.includes(row.bucket);
  return true;
};

const downloadDespatchExcel = (title, rows) => {
  const headers = ["Sr No", "Docket", "Scheduled date", "Arrival date", "Despatch date", "Lane", "From", "To", "Consignor", "Consignee", "Pkgs", "Weight", "Despatch"];
  const body = rows.map((row, index) => [
    index + 1,
    row.docket_no || "",
    showDate(row.docket_date),
    showDate(row.arrival_date),
    showDate(row.desp_date),
    row.lane || "",
    `${row.docket_loc || ""}${row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}`,
    `${row.docket_to_loc || ""}${row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}`,
    row.cnor_name || "",
    row.cnee_name || "",
    `${row.desp_pkgs ?? 0}/${row.docket_tot_pkgs ?? 0}`,
    row.docket_act_wt ?? "",
    statusText(row.source, row.bucket),
  ]);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Despatches">
<Table>
<Row>${excelCell(title || "Despatch details")}</Row>
<Row>${headers.map((label) => excelCell(label)).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => excelCell(value)).join("")}</Row>`).join("")}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "despatch-dockets.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const PERIOD_LABEL = { today: "Today", week: "Last 7 days", month: "This month", fy: "This FY" };

const emptySide = () => ({
  same: 0, next: 0, after: 0, d1: 0, d2: 0, over: 0, despatched: 0, undespatched: 0, total: 0,
});

const emptyLane = () => ({ origin: emptySide(), hub: emptySide(), dest: emptySide(), total: 0 });

const EMPTY = {
  asOf: "",
  fyStart: "",
  fyLabel: "This FY",
  periods: ["today", "week", "month", "fy"].map((key) => ({
    key, label: PERIOD_LABEL[key], total: 0, ftl: emptyLane(), ptl: emptyLane(),
  })),
};

const readSide = (side) => {
  const same = Number(side?.same || 0);
  const next = Number(side?.next || 0);
  const after = Number(side?.after || 0);
  const d1 = Number(side?.d1 || 0);
  const d2 = Number(side?.d2 || 0);
  const over = Number(side?.over || 0);
  return {
    same, next, after, d1, d2, over,
    despatched: Number(side?.despatched ?? same + next + after),
    undespatched: Number(side?.undespatched ?? d1 + d2 + over),
    total: Number(side?.total ?? same + next + after + d1 + d2 + over),
  };
};

const addSide = (a, b) => readSide({
  same: a.same + b.same,
  next: a.next + b.next,
  after: a.after + b.after,
  d1: a.d1 + b.d1,
  d2: a.d2 + b.d2,
  over: a.over + b.over,
});

const readLane = (lane) => ({
  origin: readSide(lane?.origin),
  hub: readSide(lane?.hub),
  dest: readSide(lane?.dest),
  total: Number(lane?.total || 0),
});

const mixPeriod = (period, lane = "both") => {
  if (lane === "FTL") return readLane(period?.ftl);
  if (lane === "PTL") return readLane(period?.ptl);
  const ftl = readLane(period?.ftl);
  const ptl = readLane(period?.ptl);
  return {
    origin: addSide(ftl.origin, ptl.origin),
    hub: addSide(ftl.hub, ptl.hub),
    dest: addSide(ftl.dest, ptl.dest),
    total: Number(period?.total || ftl.total + ptl.total),
  };
};

function Fig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {fmt(value)}
    </button>
  );
}

function SideHead({ corner = "Period" }) {
  return (
    <thead>
      <tr>
        <th rowSpan={2}>{corner}</th>
        <th colSpan={3} className="ordMgmt__sent">Despatched</th>
        <th colSpan={3} className="ordMgmt__pending">Undespatched</th>
        <th rowSpan={2}>Total</th>
      </tr>
      <tr>
        <th>Same<br />day</th>
        <th>Next<br />day</th>
        <th>&gt;2<br />days</th>
        <th>1<br />day</th>
        <th>2<br />days</th>
        <th>&gt; 2<br />days</th>
      </tr>
    </thead>
  );
}

function SideRow({ label, side, onOpen }) {
  const cells = [
    ["same", side.same, "ok"],
    ["next", side.next, "move"],
    ["after", side.after, "late"],
    ["d1", side.d1, "wait"],
    ["d2", side.d2, "wait"],
    ["over", side.over, "late"],
  ];
  return (
    <tr>
      <td>{label}</td>
      {cells.map(([bucket, value, tone]) => (
        <td key={bucket}><Fig value={value} tone={tone} onClick={() => onOpen(bucket)} /></td>
      ))}
      <td className="ordMgmt__sum"><Fig value={side.total} onClick={() => onOpen("all")} /></td>
    </tr>
  );
}

function SourceTable({ title, periods, lane, source, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">{title}</div>
      <table className="ordMgmt">
        <SideHead />
        <tbody>
          {periods.map((period) => {
            const side = mixPeriod(period, lane)[source];
            return (
              <SideRow
                key={period.key}
                label={period.label}
                side={side}
                onOpen={(bucket) => onSlice(period.key, bucket === "all" ? source : `${source}_${bucket}`)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DespatchManagementBoard({ board, lane = "both", onSlice }) {
  const periods = board?.periods?.length ? board.periods : EMPTY.periods;
  return (
    <div className="ordPair ordPair--3">
      <SourceTable title="From origin" periods={periods} lane={lane} source="origin" onSlice={onSlice} />
      <SourceTable title="From hubs" periods={periods} lane={lane} source="hub" onSlice={onSlice} />
      <SourceTable title="From destination" periods={periods} lane={lane} source="dest" onSlice={onSlice} />
    </div>
  );
}

function LaneSource({ title, period, source, onSlice }) {
  const rows = [
    ["Both", "all", mixPeriod(period, "both")[source]],
    ["FTL", "FTL", mixPeriod(period, "FTL")[source]],
    ["PTL", "PTL", mixPeriod(period, "PTL")[source]],
  ];
  return (
    <div>
      <div className="ordSource">{title}</div>
      <table className="ordMgmt">
        <SideHead corner="Lane" />
        <tbody>
          {rows.map(([label, lane, side]) => (
            <SideRow
              key={lane}
              label={label}
              side={side}
              onOpen={(bucket) => onSlice(period.key, lane, bucket === "all" ? source : `${source}_${bucket}`)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DespatchDrill({ open, onClose, start = null }) {
  const listLane = start?.lane === "FTL" || start?.lane === "PTL" ? start.lane : "all";
  const openOnList = Boolean(start?.period);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState(openOnList ? "list" : "board");
  const lanePeriod = start?.period || "fy";
  const [listReturn, setListReturn] = useState(openOnList ? "lanes" : "board");
  const [focus, setFocus] = useState(openOnList ? {
    title: `${PERIOD_LABEL[start.period] || start.period} · ${listLane === "all" ? "FTL + PTL" : listLane} · ${sliceLabel(start.slice)}`,
  } : null);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(openOnList);
  const [listError, setListError] = useState("");
  const [listQuery, setListQuery] = useState(openOnList ? { slice: start?.slice || "all" } : { slice: "all" });
  const startPeriod = start?.period || "";
  const startSlice = start?.slice || "all";

  useEffect(() => {
    let cancelled = false;
    fetchDespatchBoard()
      .then((next) => { if (!cancelled) setBoard(next); })
      .catch(() => { if (!cancelled) setError("Despatches could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (openOnList) {
      fetchDespatchDockets({ period: startPeriod, lane: listLane, slice: startSlice })
        .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setListError("This list could not be loaded."); })
        .finally(() => { if (!cancelled) setListLoading(false); });
    }
    return () => { cancelled = true; };
  }, [openOnList, listLane, startPeriod, startSlice]);

  const periods = board?.periods?.length ? board.periods : EMPTY.periods;
  const activePeriod = periods.find((item) => item.key === lanePeriod) || periods[periods.length - 1];

  const openSlice = (period, lane, slice, backTo) => {
    const periodLabel = periods.find((item) => item.key === period)?.label || period;
    const laneLabel = lane === "all" ? "FTL + PTL" : lane;
    setFocus({ title: `${periodLabel} · ${laneLabel} · ${sliceLabel(slice)}` });
    setListQuery({ slice });
    setListReturn(backTo);
    setScreen("list");
    setListLoading(true);
    setListError("");
    fetchDespatchDockets({ period, lane, slice })
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setListError("This list could not be loaded."))
      .finally(() => setListLoading(false));
  };

  const shown = rows.filter((row) => matchesDespatchRow(row, listQuery.slice));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Despatch management</div>
          <h2>{focus ? focus.title : "From origin, hubs, and destination"}</h2>
          <p>
            {board?.fyLabel || "This FY"} from {showDate(board?.fyStart) || "1 Apr"} to {showDate(board?.asOf) || "today"}.
            From origin lists every docket booked in the period, whether it has been despatched or is still undespatched.
            Despatched at origin means a manifest has left the booking branch. A local delivery manifest is shown in From destination as well.
            From hubs follows the unloading arrival. From destination follows the unloading arrival, and the local delivery date when the goods were not unloaded there.
            Despatched same day, next day, and greater than 2 days compares the despatch date with the docket date at origin, with the arrival at a hub, and with the arrival at the destination.
            Undespatched 1 day is today or yesterday, 2 days is the day before that, and greater than 2 days is older.
          </p>
        </div>
        <div className="ordHead__actions">
          {screen === "list" && listReturn && (
            <button type="button" className="ordBack" onClick={() => { setFocus(null); setScreen(listReturn); }}>
              <ArrowBackIcon style={{ fontSize: 16 }} /> Back
            </button>
          )}
          {screen === "lanes" && (
            <button type="button" className="ordBack" onClick={() => setScreen("board")}>All slabs</button>
          )}
          <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
        </div>
      </div>
      <DialogContent className="ordBody">
        {loading && <div className="ordState"><CircularProgress size={22} /> Loading despatches</div>}
        {error && <div className="ordState">{error}</div>}
        {!loading && !error && screen === "board" && (
          <div>
            {periods.map((period) => (
              <section key={period.key}>
                <div className="ordSource">{period.label}</div>
                <div className="ordPair ordPair--3">
                  <LaneSource title="From origin" period={period} source="origin" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "board")} />
                  <LaneSource title="From hubs" period={period} source="hub" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "board")} />
                  <LaneSource title="From destination" period={period} source="dest" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "board")} />
                </div>
              </section>
            ))}
          </div>
        )}
        {!loading && !error && screen === "lanes" && activePeriod && (
          <div className="ordPair ordPair--3">
            <LaneSource title={`${activePeriod.label} · from origin`} period={activePeriod} source="origin" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "lanes")} />
            <LaneSource title={`${activePeriod.label} · from hubs`} period={activePeriod} source="hub" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "lanes")} />
            <LaneSource title={`${activePeriod.label} · from destination`} period={activePeriod} source="dest" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "lanes")} />
          </div>
        )}
        {!loading && screen === "list" && (
          listLoading ? <div className="ordState"><CircularProgress size={22} /> Loading dockets</div>
            : listError ? <div className="ordState">{listError}</div>
              : (
                <div className="ordListWrap">
                  <div className="ordListBar">
                    <div className="ordListMeta">{fmt(shown.length)} docket{shown.length === 1 ? "" : "s"}{rows.length === 1000 ? " · first 1,000" : ""}</div>
                    <button type="button" className="ordBack" disabled={!shown.length} onClick={() => downloadDespatchExcel(focus?.title, shown)}>Export to Excel</button>
                  </div>
                  <table className="ordList">
                    <thead>
                      <tr>
                        <th>Sr No</th>
                        <th>Docket</th>
                        <th>Scheduled date</th>
                        <th>Arrival date</th>
                        <th>Despatch date</th>
                        <th>Lane</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Consignor</th>
                        <th>Consignee</th>
                        <th>Pkgs</th>
                        <th>Weight</th>
                        <th>Despatch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.length === 0 && (
                        <tr><td colSpan={13} className="ordEmpty">No dockets in this slice</td></tr>
                      )}
                      {shown.map((row, index) => (
                        <tr key={`${row.docket_no}-${row.docket_date}`}>
                          <td>{index + 1}</td>
                          <td>{row.docket_no}</td>
                          <td>{showDate(row.docket_date)}</td>
                          <td>{showDate(row.arrival_date)}</td>
                          <td>{showDate(row.desp_date)}</td>
                          <td>{row.lane}</td>
                          <td>{row.docket_loc}{row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}</td>
                          <td>{row.docket_to_loc}{row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}</td>
                          <td>{row.cnor_name || ""}</td>
                          <td>{row.cnee_name || ""}</td>
                          <td>{row.desp_pkgs ?? 0}/{row.docket_tot_pkgs ?? 0}</td>
                          <td>{row.docket_act_wt ?? ""}</td>
                          <td>{statusText(row.source, row.bucket)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
        )}
      </DialogContent>
    </Dialog>
  );
}
