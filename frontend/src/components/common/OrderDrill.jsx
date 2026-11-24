import { useEffect, useState } from "react";
import { Dialog, DialogContent, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchOrderBoard, fetchOrderDockets } from "../../utils/dashboard";

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

const downloadOrderExcel = (title, rows) => {
  const headers = ["Sr No", "Docket", "Scheduled date", "Placement date", "Lane", "From", "To", "Consignor", "Consignee", "Pkgs", "Weight", "Placement"];
  const body = rows.map((row, index) => [
    index + 1,
    row.docket_no || "",
    showDate(row.docket_date),
    showDate(row.place_date),
    row.lane || "",
    `${row.docket_loc || ""}${row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}`,
    `${row.docket_to_loc || ""}${row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}`,
    row.cnor_name || "",
    row.cnee_name || "",
    `${row.desp_pkgs ?? 0}/${row.docket_tot_pkgs ?? 0}`,
    row.docket_act_wt ?? "",
    row.placement || "",
  ]);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Orders">
<Table>
<Row>${excelCell(title || "Order details")}</Row>
<Row>${headers.map((label) => excelCell(label)).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => excelCell(value)).join("")}</Row>`).join("")}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "order-dockets.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const SLICE_LABEL = {
  all: "All orders",
  placed: "Placed",
  ontime: "Placed · on time",
  delay: "Placed · delayed",
  pending: "Pending pickup",
  pend_same: "Pending · same day",
  pend_last: "Pending · last day",
  pend_over: "Pending · > 2 days",
};

const emptyLane = () => ({
  total: 0, placed: 0, onTime: 0, delay: 0,
  pending: { total: 0, same: 0, last: 0, over: 0 },
});

const EMPTY_ORDERS = {
  asOf: "",
  fyStart: "",
  fyLabel: "This FY",
  periods: [
    { key: "today", label: "Today", total: 0, ftl: emptyLane(), ptl: emptyLane() },
    { key: "week", label: "Last 7 days", total: 0, ftl: emptyLane(), ptl: emptyLane() },
    { key: "month", label: "This month", total: 0, ftl: emptyLane(), ptl: emptyLane() },
    { key: "fy", label: "This FY", total: 0, ftl: emptyLane(), ptl: emptyLane() },
  ],
};

const readMix = (lane) => {
  const pending = lane?.pending || {};
  return {
    onTime: Number(lane?.onTime || 0),
    delay: Number(lane?.delay || 0),
    same: Number(pending.same || 0),
    last: Number(pending.last || 0),
    over: Number(pending.over || 0),
    total: Number(lane?.total || 0),
  };
};

const mixPeriod = (period) => {
  const ftl = readMix(period?.ftl);
  const ptl = readMix(period?.ptl);
  return {
    onTime: ftl.onTime + ptl.onTime,
    delay: ftl.delay + ptl.delay,
    same: ftl.same + ptl.same,
    last: ftl.last + ptl.last,
    over: ftl.over + ptl.over,
    total: Number(period?.total || 0),
  };
};

function Fig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {fmt(value)}
    </button>
  );
}

export function OrderManagementBoard({ board, lane = "both", onSlice }) {
  const periods = board?.periods?.length ? board.periods : EMPTY_ORDERS.periods;
  const mixFor = (period) => {
    if (lane === "FTL") return readMix(period?.ftl);
    if (lane === "PTL") return readMix(period?.ptl);
    return mixPeriod(period);
  };
  return (
    <table className="ordMgmt">
      <thead>
        <tr>
          <th rowSpan={2}>Period</th>
          <th colSpan={3} className="ordMgmt__placed">Placed</th>
          <th colSpan={4} className="ordMgmt__pending">Pending</th>
          <th rowSpan={2}>Orders</th>
        </tr>
        <tr>
          <th>On<br />time</th>
          <th>Delayed</th>
          <th>Total</th>
          <th>Same<br />day</th>
          <th>Last<br />day</th>
          <th>&gt; 2<br />days</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => {
          const mix = mixFor(period);
          const placed = mix.onTime + mix.delay;
          const pending = mix.same + mix.last + mix.over;
          return (
            <tr key={period.key}>
              <td>{period.label}</td>
              <td><Fig value={mix.onTime} tone="ok" onClick={() => onSlice(period.key, "ontime")} /></td>
              <td><Fig value={mix.delay} tone="late" onClick={() => onSlice(period.key, "delay")} /></td>
              <td className="ordMgmt__sum"><Fig value={placed} onClick={() => onSlice(period.key, "placed")} /></td>
              <td><Fig value={mix.same} tone="wait" onClick={() => onSlice(period.key, "pend_same")} /></td>
              <td><Fig value={mix.last} tone="wait" onClick={() => onSlice(period.key, "pend_last")} /></td>
              <td><Fig value={mix.over} tone="wait" onClick={() => onSlice(period.key, "pend_over")} /></td>
              <td className="ordMgmt__sum"><Fig value={pending} tone="wait" onClick={() => onSlice(period.key, "pending")} /></td>
              <td className="ordMgmt__sum"><Fig value={mix.total} onClick={() => onSlice(period.key, "all")} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LaneBlock({ period, laneKey, title, onSlice }) {
  const lane = readMix(period[laneKey]);
  const open = (slice) => onSlice(period.key, laneKey === "ftl" ? "FTL" : "PTL", slice);
  return (
    <div className="ordLane">
      <div className="ordLane__head">
        <span>{title}</span>
        <Fig value={lane.total} onClick={() => open("all")} />
      </div>
      <div className="ordSplit">
        <div>
          <span>Placed</span>
          <Fig value={lane.onTime + lane.delay} onClick={() => open("placed")} />
        </div>
        <div>
          <span>On time</span>
          <Fig value={lane.onTime} tone="ok" onClick={() => open("ontime")} />
        </div>
        <div>
          <span>Delayed</span>
          <Fig value={lane.delay} tone="late" onClick={() => open("delay")} />
        </div>
      </div>
      <div className="ordPending">
        <div className="ordPending__title">
          <span>Pending pickup</span>
          <Fig value={lane.same + lane.last + lane.over} tone="wait" onClick={() => open("pending")} />
        </div>
        <div className="ordAges">
          <div><span>Same day</span><Fig value={lane.same} tone="wait" onClick={() => open("pend_same")} /></div>
          <div><span>Last day</span><Fig value={lane.last} tone="wait" onClick={() => open("pend_last")} /></div>
          <div><span>&gt; 2 days</span><Fig value={lane.over} tone="wait" onClick={() => open("pend_over")} /></div>
        </div>
      </div>
    </div>
  );
}

function LaneSheet({ period, highlight, onSlice }) {
  const both = mixPeriod(period);
  const rows = [
    ["Both", "all", both],
    ["FTL", "FTL", readMix(period?.ftl)],
    ["PTL", "PTL", readMix(period?.ptl)],
  ];
  return (
    <table className="ordMgmt">
      <thead>
        <tr>
          <th rowSpan={2}>Lane</th>
          <th colSpan={3} className="ordMgmt__placed">Placed</th>
          <th colSpan={4} className="ordMgmt__pending">Pending pickup</th>
          <th rowSpan={2}>Total orders</th>
        </tr>
        <tr>
          <th className={highlight === "ontime" ? "is-hot" : ""}>On time</th>
          <th className={highlight === "delay" ? "is-hot" : ""}>Delayed</th>
          <th className={highlight === "placed" ? "is-hot" : ""}>Total</th>
          <th className={highlight === "pend_same" ? "is-hot" : ""}>Same day</th>
          <th className={highlight === "pend_last" ? "is-hot" : ""}>Last day</th>
          <th className={highlight === "pend_over" ? "is-hot" : ""}>&gt; 2 days</th>
          <th className={highlight === "pending" ? "is-hot" : ""}>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([title, lane, mix]) => (
          <tr key={lane}>
            <td>{title}</td>
            <td className={highlight === "ontime" ? "is-hot" : ""}><Fig value={mix.onTime} tone="ok" onClick={() => onSlice(period.key, lane, "ontime")} /></td>
            <td className={highlight === "delay" ? "is-hot" : ""}><Fig value={mix.delay} tone="late" onClick={() => onSlice(period.key, lane, "delay")} /></td>
            <td className={`ordMgmt__sum${highlight === "placed" ? " is-hot" : ""}`}><Fig value={mix.onTime + mix.delay} onClick={() => onSlice(period.key, lane, "placed")} /></td>
            <td className={highlight === "pend_same" ? "is-hot" : ""}><Fig value={mix.same} tone="wait" onClick={() => onSlice(period.key, lane, "pend_same")} /></td>
            <td className={highlight === "pend_last" ? "is-hot" : ""}><Fig value={mix.last} tone="wait" onClick={() => onSlice(period.key, lane, "pend_last")} /></td>
            <td className={highlight === "pend_over" ? "is-hot" : ""}><Fig value={mix.over} tone="wait" onClick={() => onSlice(period.key, lane, "pend_over")} /></td>
            <td className={`ordMgmt__sum${highlight === "pending" ? " is-hot" : ""}`}><Fig value={mix.same + mix.last + mix.over} tone="wait" onClick={() => onSlice(period.key, lane, "pending")} /></td>
            <td className="ordMgmt__sum"><Fig value={mix.total} onClick={() => onSlice(period.key, lane, "all")} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const PERIOD_LABEL = { today: "Today", week: "Last 7 days", month: "This month", fy: "This FY" };

function matchesOrderRow(row, query) {
  if (!query) return true;
  const lane = query.lane;
  if ((lane === "FTL" || lane === "PTL") && row?.lane && row.lane !== lane) return false;
  const placement = String(row?.placement || "");
  const slice = query.slice || "all";
  if (slice === "all") return true;
  if (!placement) return false;
  if (slice === "ontime") return placement === "Placed · on time";
  if (slice === "delay") return placement === "Placed · delay";
  if (slice === "placed") return placement.startsWith("Placed");
  if (slice === "pending") return placement.startsWith("Pending");
  if (slice === "pend_same") return placement === "Pending · same day";
  if (slice === "pend_last") return placement === "Pending · last day";
  if (slice === "pend_over") return placement === "Pending · > 2 days";
  return true;
}

export default function OrderDrill({ open, onClose, start = null }) {
  const listLane = start?.lane === "FTL" || start?.lane === "PTL" ? start.lane : "all";
  const openOnList = Boolean(start?.period);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState(openOnList ? "list" : "board");
  const lanePeriod = start?.period || "fy";
  const [highlight, setHighlight] = useState(start?.slice || "");
  const [listReturn, setListReturn] = useState(openOnList ? "lanes" : "board");
  const [focus, setFocus] = useState(openOnList ? {
    title: `${PERIOD_LABEL[start.period] || start.period} · ${listLane === "all" ? "FTL + PTL" : listLane} · ${SLICE_LABEL[start.slice] || start.slice}`,
  } : null);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(openOnList);
  const [listError, setListError] = useState("");
  const [listQuery, setListQuery] = useState(openOnList ? { lane: listLane, slice: start?.slice || "all" } : { lane: "all", slice: "all" });
  const startPeriod = start?.period || "";
  const startSlice = start?.slice || "all";

  useEffect(() => {
    let cancelled = false;
    fetchOrderBoard()
      .then((next) => { if (!cancelled) setBoard(next); })
      .catch(() => { if (!cancelled) setError("Orders could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (openOnList) {
      fetchOrderDockets({ period: startPeriod, lane: listLane, slice: startSlice })
        .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setListError("This list could not be loaded."); })
        .finally(() => { if (!cancelled) setListLoading(false); });
    }
    return () => { cancelled = true; };
  }, [openOnList, listLane, startPeriod, startSlice]);

  const periods = board?.periods?.length ? board.periods : EMPTY_ORDERS.periods;
  const activePeriod = periods.find((item) => item.key === lanePeriod) || periods[0];

  const openSlice = (period, lane, slice, backTo) => {
    const periodLabel = periods.find((item) => item.key === period)?.label || period;
    const laneLabel = lane === "all" ? "FTL + PTL" : lane;
    setFocus({ title: `${periodLabel} · ${laneLabel} · ${SLICE_LABEL[slice] || slice}` });
    setListQuery({ lane, slice });
    setListReturn(backTo);
    setScreen("list");
    setListLoading(true);
    setListError("");
    fetchOrderDockets({ period, lane, slice })
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setListError("This list could not be loaded."))
      .finally(() => setListLoading(false));
  };

  const goBack = () => {
    setFocus(null);
    setScreen(listReturn);
  };
  const shown = rows.filter((row) => matchesOrderRow(row, listQuery));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Order management</div>
          <h2>{focus ? focus.title : screen === "lanes" ? `${activePeriod?.label || "Time slab"} · FTL and PTL` : "Lane split"}</h2>
          <p>
            {board?.fyLabel || "This FY"} from {showDate(board?.fyStart) || "1 Apr"} to {showDate(board?.asOf) || "today"}.
            PTL includes LTL and Sundry. Placed means a manifest has been created.
            Scheduled date is the docket date. Placement date is the first manifest date. On time means that date is on or before the scheduled date. Delayed means it is after the scheduled date.
            Pending same day and last day follow the booking date. Pending greater than 2 days is a booking from the day before yesterday or earlier with no manifest.
          </p>
        </div>
        <div className="ordHead__actions">
          {screen === "list" && listReturn && (
            <button type="button" className="ordBack" onClick={goBack}>
              <ArrowBackIcon style={{ fontSize: 16 }} /> Back
            </button>
          )}
          {screen === "lanes" && (
            <button type="button" className="ordBack" onClick={() => setScreen("board")}>
              All slabs
            </button>
          )}
          {screen === "board" && start?.period && (
            <button type="button" className="ordBack" onClick={() => setScreen("lanes")}>
              <ArrowBackIcon style={{ fontSize: 16 }} /> {activePeriod?.label || "Slab"}
            </button>
          )}
          <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
        </div>
      </div>
      <DialogContent className="ordBody">
        {loading && <div className="ordState"><CircularProgress size={22} /> Loading orders</div>}
        {error && <div className="ordState">{error}</div>}
        {!loading && !error && screen === "board" && (
          <div className="ordGrid">
            {periods.map((period) => (
              <section key={period.key} className="ordCol">
                <header>
                  <span>{period.label}</span>
                  <Fig value={period.total} onClick={() => openSlice(period.key, "all", "all", "board")} />
                </header>
                <LaneBlock period={period} laneKey="ftl" title="FTL" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "board")} />
                <LaneBlock period={period} laneKey="ptl" title="PTL" onSlice={(p, lane, slice) => openSlice(p, lane, slice, "board")} />
              </section>
            ))}
          </div>
        )}
        {!loading && !error && screen === "lanes" && (
          <LaneSheet
            period={activePeriod}
            highlight={highlight}
            onSlice={(period, lane, slice) => {
              setHighlight(slice);
              openSlice(period, lane, slice, "lanes");
            }}
          />
        )}
        {!loading && screen === "list" && (
          listLoading ? <div className="ordState"><CircularProgress size={22} /> Loading dockets</div>
            : listError ? <div className="ordState">{listError}</div>
              : (
                <div className="ordListWrap">
                  <div className="ordListBar">
                    <div className="ordListMeta">{fmt(shown.length)} docket{shown.length === 1 ? "" : "s"}{rows.length === 1000 ? " · first 1,000" : ""}</div>
                    <button type="button" className="ordBack" disabled={!shown.length} onClick={() => downloadOrderExcel(focus?.title, shown)}>Export to Excel</button>
                  </div>
                  <table className="ordList">
                    <thead>
                      <tr>
                        <th>Sr No</th>
                        <th>Docket</th>
                        <th>Scheduled date</th>
                        <th>Placement date</th>
                        <th>Lane</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Consignor</th>
                        <th>Consignee</th>
                        <th>Pkgs</th>
                        <th>Weight</th>
                        <th>Placement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.length === 0 && (
                        <tr><td colSpan={12} className="ordEmpty">No dockets in this slice</td></tr>
                      )}
                      {shown.map((row, index) => (
                        <tr key={`${row.docket_no}-${row.docket_date}`}>
                          <td>{index + 1}</td>
                          <td>{row.docket_no}</td>
                          <td>{showDate(row.docket_date)}</td>
                          <td>{showDate(row.place_date)}</td>
                          <td>{row.lane}</td>
                          <td>{row.docket_loc}{row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}</td>
                          <td>{row.docket_to_loc}{row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}</td>
                          <td>{row.cnor_name || ""}</td>
                          <td>{row.cnee_name || ""}</td>
                          <td>{row.desp_pkgs ?? 0}/{row.docket_tot_pkgs ?? 0}</td>
                          <td>{row.docket_act_wt ?? ""}</td>
                          <td className={String(row.placement || "").includes("delay") ? "is-late" : String(row.placement || "").includes("Pending") ? "is-wait" : "is-ok"}>{row.placement}</td>
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
