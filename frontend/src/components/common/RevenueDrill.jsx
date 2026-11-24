import { useEffect, useState } from "react";
import { Dialog, DialogContent, IconButton, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { fetchCollectionBills, fetchCollectionReceipts, fetchEwbBills, fetchHireVouchers, fetchOutstandingBills, fetchRevenueBoard, fetchRevenueDockets } from "../../utils/dashboard";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const PAYS = [
  { key: "topay", title: "To Pay" },
  { key: "paid", title: "Paid" },
  { key: "tbb", title: "TBB" },
];

const PAY_LABEL = { topay: "To Pay", paid: "Paid", tbb: "TBB" };
const PERIOD_LABEL = { today: "Today", week: "Last 7 days", month: "This month", fy: "This FY" };
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (key) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ""));
  if (!match) return PERIOD_LABEL[key] || key;
  return `${MONTH_NAMES[Number(match[2]) - 1] || match[2]} ${match[1]}`;
};
const EMPTY = { billed: 0, unbilled: 0, total: 0, billedCount: 0, unbilledCount: 0, totalCount: 0 };

const statusText = (pay, billed) => {
  if (pay === "topay" || pay === "paid") return PAY_LABEL[pay] || pay;
  return `${PAY_LABEL[pay] || pay} · ${billed ? "Billed" : "Unbilled"}`;
};

const sliceLabel = (slice) => {
  if (slice === "all") return "To Pay, Paid and TBB";
  const pay = PAYS.find((item) => slice === item.key || slice.startsWith(`${item.key}_`));
  if (!pay) return slice;
  if (slice === pay.key) return pay.title;
  return `${pay.title} · ${slice.endsWith("_billed") ? "Billed" : "Unbilled"}`;
};

function Fig({ value, tone = "plain", onClick }) {
  return (
    <button type="button" className={`ordFig ordFig--${tone}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {money(value)}
    </button>
  );
}

function CountFig({ value, onClick }) {
  return (
    <button type="button" className="ordFig" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      {Number(value || 0).toLocaleString("en-IN")}
    </button>
  );
}

function CashTable({ title, pay, periods, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">{title}</div>
      <table className="ordMgmt">
        <thead>
          <tr>
            <th>Period</th>
            <th>Dockets</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const side = period[pay] || { count: 0, amount: 0 };
            const open = () => onSlice(period.key, pay);
            return (
              <tr key={`${pay}-${period.key}`}>
                <td>{period.label}</td>
                <td><CountFig value={side.count} onClick={open} /></td>
                <td className="ordMgmt__sum"><Fig value={side.amount} onClick={open} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PayTable({ title, pay, periods, onSlice }) {
  return (
    <div className="ordSourceBlock">
      <div className="ordSource">{title}</div>
      <table className="ordMgmt">
        <thead>
          <tr>
            <th rowSpan={2}>Period</th>
            <th colSpan={2}>Billed</th>
            <th colSpan={2}>Unbilled</th>
            <th colSpan={2}>Total</th>
          </tr>
          <tr>
            <th>Dockets</th>
            <th>Amount</th>
            <th>Dockets</th>
            <th>Amount</th>
            <th>Dockets</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const side = period[pay] || EMPTY;
            const open = (bucket) => onSlice(period.key, bucket === "all" ? pay : `${pay}_${bucket}`);
            return (
              <tr key={`${pay}-${period.key}`}>
                <td>{period.label}</td>
                <td><CountFig value={side.billedCount} onClick={() => open("billed")} /></td>
                <td><Fig tone="ok" value={side.billed} onClick={() => open("billed")} /></td>
                <td><CountFig value={side.unbilledCount} onClick={() => open("unbilled")} /></td>
                <td><Fig tone="late" value={side.unbilled} onClick={() => open("unbilled")} /></td>
                <td className="ordMgmt__sum"><CountFig value={side.totalCount} onClick={() => open("all")} /></td>
                <td className="ordMgmt__sum"><Fig value={side.total} onClick={() => open("all")} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RevenueBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  return (
    <div className="ordPair ordPair--rev">
      <CashTable title="To Pay" pay="topay" periods={periods} onSlice={onSlice} />
      <CashTable title="Paid" pay="paid" periods={periods} onSlice={onSlice} />
      <PayTable title="TBB" pay="tbb" periods={periods} onSlice={onSlice} />
    </div>
  );
}

export function RevenueMonths({ board, onSlice }) {
  const months = board?.months || [];
  const sum = (pick) => months.reduce((total, month) => total + Number(pick(month) || 0), 0);
  const pair = (month, count, amount, slice, sumCell) => (
    <>
      <td className={sumCell ? "ordMgmt__sum" : undefined}><CountFig value={count} onClick={() => onSlice(month.key, slice)} /></td>
      <td className={sumCell ? "ordMgmt__sum" : undefined}><Fig value={amount} onClick={() => onSlice(month.key, slice)} /></td>
    </>
  );
  return (
    <table className="ordMgmt ordMgmt--months">
      <thead>
        <tr>
          <th rowSpan={2}>Month</th>
          <th colSpan={2}>To Pay</th>
          <th colSpan={2}>Paid</th>
          <th colSpan={2}>TBB</th>
          <th colSpan={2}>Total</th>
        </tr>
        <tr>
          <th>Dockets</th><th>Amount</th>
          <th>Dockets</th><th>Amount</th>
          <th>Dockets</th><th>Amount</th>
          <th>Dockets</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {months.map((month) => (
          <tr key={month.key}>
            <td>{month.label}</td>
            {pair(month, month.topay?.count, month.topay?.amount, "topay")}
            {pair(month, month.paid?.count, month.paid?.amount, "paid")}
            {pair(month, month.tbb?.totalCount, month.tbb?.total, "tbb")}
            {pair(month, month.count, month.total, "all", true)}
          </tr>
        ))}
        <tr>
          <td>This FY</td>
          {pair({ key: "fy" }, sum((month) => month.topay?.count), sum((month) => month.topay?.amount), "topay", true)}
          {pair({ key: "fy" }, sum((month) => month.paid?.count), sum((month) => month.paid?.amount), "paid", true)}
          {pair({ key: "fy" }, sum((month) => month.tbb?.totalCount), sum((month) => month.tbb?.total), "tbb", true)}
          {pair({ key: "fy" }, sum((month) => month.count), sum((month) => month.total), "all", true)}
        </tr>
      </tbody>
    </table>
  );
}

const COLLECTION_COLS = [
  ["raised", "Bills", "raised"],
  ["submitted", "Bills", "submitted"],
  ["unsubmitted", "Bills", "unsubmitted"],
  ["realised", "Bills", "realised"],
  ["outstanding", "Bills", "outstanding"],
  ["receipt", "Receipt", "amount"],
  ["unadjusted", "Unadjusted", "amount"],
];

export function CollectionBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  return (
    <table className="ordMgmt ordMgmt--collect">
      <thead>
        <tr>
          <th>Period</th>
          <th>Bills<br />raised</th>
          <th>Bills<br />submitted</th>
          <th>Bills<br />unsubmitted</th>
          <th>Realised<br />bills</th>
          <th>Outstanding<br />bills</th>
          <th>Receipt<br />amount</th>
          <th>Unadjusted<br />amount</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period.key}>
            <td>{period.label}</td>
            {COLLECTION_COLS.map(([key]) => (
              <td key={key} className={key === "outstanding" || key === "unadjusted" ? "ordMgmt__sum" : undefined}>
                <Fig value={period[key]} onClick={() => onSlice(period.key, key)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const downloadDockets = (title, rows) => {
  const headers = ["Sr No", "Docket", "Date", "Pay type", "From", "To", "Consignor", "Consignee", "Amount", "Billing", "Invoice", "Invoice date"];
  const body = rows.map((row, index) => [
    index + 1,
    row.docket_no || "",
    showDate(row.docket_date),
    PAY_LABEL[row.pay] || row.pay || "",
    `${row.docket_loc || ""}${row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}`,
    `${row.docket_to_loc || ""}${row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}`,
    row.cnor_name || "",
    row.cnee_name || "",
    money(row.amt),
    row.pay === "topay" || row.pay === "paid" ? "" : (row.billed ? "Billed" : "Unbilled"),
    row.invoice_no || "",
    showDate(row.invoice_date),
  ]);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Revenue">
<Table>
<Row>${excelCell(title || "Revenue dockets")}</Row>
<Row>${headers.map((label) => excelCell(label)).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => excelCell(value)).join("")}</Row>`).join("")}
</Table>
</Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "revenue-dockets.xls";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function RevenueDrill({ open, onClose, start = null }) {
  const openOnList = Boolean(start?.slice);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState(openOnList ? "list" : "board");
  const [focus, setFocus] = useState(openOnList ? {
    title: `${monthLabel(start.period)} · ${sliceLabel(start.slice)}`,
    period: start.period || "fy",
  } : null);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(openOnList);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchRevenueBoard()
      .then((next) => { if (!cancelled) setBoard(next); })
      .catch(() => { if (!cancelled) setError("Revenue could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (openOnList) {
      fetchRevenueDockets({ period: start.period || "fy", slice: start.slice })
        .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
        .catch(() => { if (!cancelled) setListError("This list could not be loaded."); })
        .finally(() => { if (!cancelled) setListLoading(false); });
    }
    return () => { cancelled = true; };
  }, [openOnList, start?.period, start?.slice]);

  const periodLabel = (key) => board?.periods?.find((item) => item.key === key)?.label
    || board?.months?.find((item) => item.key === key)?.label
    || monthLabel(key);

  const openSlice = (period, slice) => {
    setFocus({ title: `${periodLabel(period)} · ${sliceLabel(slice)}`, period });
    setScreen("list");
    setListLoading(true);
    setListError("");
    fetchRevenueDockets({ period, slice })
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setListError("This list could not be loaded."))
      .finally(() => setListLoading(false));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Revenue</div>
          <h2>{focus ? focus.title : "Revenue"}</h2>
          <p>
            {board?.fyLabel || "This FY"} from {showDate(board?.fyStart) || "1 Apr"} to {showDate(board?.asOf) || "today"}.
            Each figure is the docket amount. Periods follow the docket date.
            Billed means the docket is on an invoice that has not been cancelled.
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
        {loading && screen === "board" ? <div className="ordState"><CircularProgress size={22} /> Loading revenue</div>
          : error ? <div className="ordState">{error}</div>
            : screen === "board" ? <RevenueBoard board={board} onSlice={openSlice} />
              : listLoading ? <div className="ordState"><CircularProgress size={22} /> Loading dockets</div>
                : listError ? <div className="ordState">{listError}</div>
                  : (
                    <div className="ordListWrap">
                      <div className="ordListBar">
                        <div className="ordListMeta">{rows.length.toLocaleString("en-IN")} docket{rows.length === 1 ? "" : "s"}{rows.length === 1000 ? " · first 1,000" : ""} · {money(rows.reduce((sum, row) => sum + Number(row.amt || 0), 0))}</div>
                        <button type="button" className="ordBack" disabled={!rows.length} onClick={() => downloadDockets(focus?.title, rows)}>Export to Excel</button>
                      </div>
                      <table className="ordList">
                        <thead>
                          <tr>
                            <th>Sr No</th>
                            <th>Docket</th>
                            <th>Date</th>
                            <th>Pay type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Consignor</th>
                            <th>Consignee</th>
                            <th>Amount</th>
                            <th>Billing</th>
                            <th>Invoice</th>
                            <th>Invoice date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 && (
                            <tr><td colSpan={12} className="ordEmpty">No dockets in this slice</td></tr>
                          )}
                          {rows.map((row, index) => (
                            <tr key={row.docket_no}>
                              <td>{index + 1}</td>
                              <td>{row.docket_no}</td>
                              <td>{showDate(row.docket_date)}</td>
                              <td>{PAY_LABEL[row.pay] || row.pay}</td>
                              <td>{row.docket_loc}{row.docket_pickup_town ? ` · ${row.docket_pickup_town}` : ""}</td>
                              <td>{row.docket_to_loc}{row.docket_dly_town ? ` · ${row.docket_dly_town}` : ""}</td>
                              <td>{row.cnor_name}</td>
                              <td>{row.cnee_name}</td>
                              <td>{money(row.amt)}</td>
                              <td>{row.pay === "topay" || row.pay === "paid" ? "" : (row.billed ? "Billed" : "Unbilled")}</td>
                              <td>{row.invoice_no}</td>
                              <td>{showDate(row.invoice_date)}</td>
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

const collectionSliceLabel = {
  raised: "Bills raised",
  submitted: "Bills submitted",
  unsubmitted: "Bills unsubmitted",
  realised: "Realised bills",
  outstanding: "Outstanding bills",
  receipt: "Receipt amount",
  unadjusted: "Unadjusted amount",
};

const billSlice = (slice) => ["raised", "submitted", "unsubmitted", "realised", "outstanding"].includes(slice);

export function CollectionDrill({ open, onClose, start = null }) {
  const period = start?.period || "fy";
  const slice = start?.slice || "raised";
  const bills = billSlice(slice);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = bills ? fetchCollectionBills : fetchCollectionReceipts;
    load({ period, slice })
      .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setError("This list could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, slice, bills]);

  const total = rows.reduce((sum, row) => sum + Number(bills ? row.bill_amt : (slice === "unadjusted" ? row.unadjusted : row.amt) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Collection</div>
          <h2>{monthLabel(period)} · {collectionSliceLabel[slice] || slice}</h2>
          <p>
            Bills follow the invoice date. Submitted means a submission date is saved.
            Realised is the amount adjusted to the bill, and outstanding is the balance.
            Receipt amount is money received. Unadjusted is a bill-collection or other receipt not yet adjusted to a bill.
          </p>
        </div>
        <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
      </div>
      <DialogContent>
        {loading ? <div className="ordState"><CircularProgress size={22} /> Loading</div>
          : error ? <div className="ordState">{error}</div>
            : (
              <div className="ordListWrap">
                <div className="ordListMeta">{rows.length.toLocaleString("en-IN")} {bills ? "bill" : "receipt"}{rows.length === 1 ? "" : "s"} · {money(total)}</div>
                {bills ? (
                  <table className="ordList">
                    <thead>
                      <tr>
                        <th>Sr No</th>
                        <th>Bill</th>
                        <th>Date</th>
                        <th>Branch</th>
                        <th>Customer</th>
                        <th>Submitted</th>
                        <th>Bill amount</th>
                        <th>Realised</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && <tr><td colSpan={9} className="ordEmpty">No bills in this slice</td></tr>}
                      {rows.map((row, index) => (
                        <tr key={`${row.invoice_no}-${row.invoice_date}-${row.loc_code}`}>
                          <td>{index + 1}</td>
                          <td>{row.invoice_no}</td>
                          <td>{showDate(row.invoice_date)}</td>
                          <td>{row.loc_code}</td>
                          <td>{row.bp_name}</td>
                          <td>{row.submitted ? showDate(row.inv_sub_date) : ""}</td>
                          <td>{money(row.bill_amt)}</td>
                          <td>{money(row.realised)}</td>
                          <td>{money(row.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="ordList">
                    <thead>
                      <tr>
                        <th>Sr No</th>
                        <th>Receipt</th>
                        <th>Date</th>
                        <th>Branch</th>
                        <th>Customer</th>
                        <th>Mode</th>
                        <th>Amount</th>
                        <th>Unadjusted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && <tr><td colSpan={8} className="ordEmpty">No receipts in this slice</td></tr>}
                      {rows.map((row, index) => (
                        <tr key={`${row.mr_no}-${row.mr_date}`}>
                          <td>{index + 1}</td>
                          <td>{row.mr_no}</td>
                          <td>{showDate(row.mr_date)}</td>
                          <td>{row.loc_code}</td>
                          <td>{row.bp_name}</td>
                          <td>{row.pay_mode}</td>
                          <td>{money(row.amt)}</td>
                          <td>{money(row.unadjusted)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
      </DialogContent>
    </Dialog>
  );
}

const OUTSTANDING_COLS = [
  ["d30", "0–30 days"],
  ["d60", "31–60 days"],
  ["d90", "61–90 days"],
  ["over", "Above 90 days"],
  ["total", "Total"],
];

const outstandingSliceLabel = Object.fromEntries(OUTSTANDING_COLS);

export function OutstandingBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  return (
    <table className="ordMgmt">
      <thead>
        <tr>
          <th>Period</th>
          {OUTSTANDING_COLS.map(([key, label]) => <th key={key}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period.key}>
            <td>{period.label}</td>
            {OUTSTANDING_COLS.map(([key]) => (
              <td key={key} className={key === "total" ? "ordMgmt__sum" : undefined}>
                <Fig value={period[key]} onClick={() => onSlice(period.key, key)} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OutstandingDrill({ open, onClose, start = null }) {
  const period = start?.period || "fy";
  const slice = start?.slice || "total";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchOutstandingBills({ period, slice })
      .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setError("This list could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, slice]);

  const total = rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Outstanding breakup</div>
          <h2>{monthLabel(period)} · {outstandingSliceLabel[slice] || slice}</h2>
          <p>
            Outstanding is the bill amount not yet realised. Age is the number of days from the invoice date to today.
            The total matches the outstanding figure on the Collection card for the same period.
          </p>
        </div>
        <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
      </div>
      <DialogContent>
        {loading ? <div className="ordState"><CircularProgress size={22} /> Loading bills</div>
          : error ? <div className="ordState">{error}</div>
            : (
              <div className="ordListWrap">
                <div className="ordListMeta">{rows.length.toLocaleString("en-IN")} bill{rows.length === 1 ? "" : "s"} · {money(total)}</div>
                <table className="ordList">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Bill</th>
                      <th>Date</th>
                      <th>Branch</th>
                      <th>Customer</th>
                      <th>Days</th>
                      <th>Bill amount</th>
                      <th>Realised</th>
                      <th>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={9} className="ordEmpty">No outstanding bills in this slice</td></tr>}
                    {rows.map((row, index) => (
                      <tr key={`${row.invoice_no}-${row.invoice_date}-${row.loc_code}`}>
                        <td>{index + 1}</td>
                        <td>{row.invoice_no}</td>
                        <td>{showDate(row.invoice_date)}</td>
                        <td>{row.loc_code}</td>
                        <td>{row.bp_name}</td>
                        <td>{Number(row.age || 0).toLocaleString("en-IN")}</td>
                        <td>{money(row.bill_amt)}</td>
                        <td>{money(row.realised)}</td>
                        <td>{money(row.outstanding)}</td>
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

const HIRE_COLS = ["total", "advance", "balance"];
const hireSliceLabel = { total: "Total", advance: "Advance", balance: "Balance" };

export function HireBoard({ board, onSlice }) {
  const periods = board?.periods || [];
  const pair = (period, key, sumCell) => (
    <>
      <td className={sumCell ? "ordMgmt__sum" : undefined}><CountFig value={period[key]?.count} onClick={() => onSlice(period.key, key)} /></td>
      <td className={sumCell ? "ordMgmt__sum" : undefined}><Fig value={period[key]?.amount} onClick={() => onSlice(period.key, key)} /></td>
    </>
  );
  return (
    <table className="ordMgmt ordMgmt--hire">
      <thead>
        <tr>
          <th rowSpan={2}>Period</th>
          <th colSpan={2}>Total</th>
          <th colSpan={2}>Advance</th>
          <th colSpan={2}>Balance</th>
        </tr>
        <tr>
          <th>Nos</th><th>Amt</th>
          <th>Nos</th><th>Amt</th>
          <th>Nos</th><th>Amt</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => (
          <tr key={period.key}>
            <td>{period.label}</td>
            {HIRE_COLS.map((key) => pair(period, key, key === "balance"))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HireDrill({ open, onClose, start = null }) {
  const period = start?.period || "fy";
  const slice = start?.slice || "hire";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchHireVouchers({ period, slice })
      .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setError("This list could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, slice]);

  const sliceKey = slice === "hire" ? "total" : slice;
  const amountKey = sliceKey === "advance" ? "advance" : sliceKey === "balance" ? "balance" : "total_amt";
  const total = rows.reduce((sum, row) => sum + Number(row[amountKey] || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">Lorry hire</div>
          <h2>{monthLabel(period)} · {hireSliceLabel[sliceKey] || slice}</h2>
          <p>
            Hire vouchers follow the voucher date. Total is the voucher amount, advance is the advance paid, and balance is the amount still open on the voucher. Nos is the number of vouchers in that column.
          </p>
        </div>
        <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
      </div>
      <DialogContent>
        {loading ? <div className="ordState"><CircularProgress size={22} /> Loading vouchers</div>
          : error ? <div className="ordState">{error}</div>
            : (
              <div className="ordListWrap">
                <div className="ordListMeta">{rows.length.toLocaleString("en-IN")} voucher{rows.length === 1 ? "" : "s"} · {money(total)}</div>
                <table className="ordList">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Voucher</th>
                      <th>Date</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Type</th>
                      <th>Vehicle</th>
                      <th>Owner</th>
                      <th>Total</th>
                      <th>Advance</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={11} className="ordEmpty">No hire vouchers in this period</td></tr>}
                    {rows.map((row, index) => (
                      <tr key={`${row.vha_no}-${row.vha_date}-${row.vha_loc}`}>
                        <td>{index + 1}</td>
                        <td>{row.vha_no}</td>
                        <td>{showDate(row.vha_date)}</td>
                        <td>{row.vha_loc}</td>
                        <td>{row.vha_to_loc}</td>
                        <td>{row.vha_type}</td>
                        <td>{row.vehicle_regis_no}</td>
                        <td>{row.vendor_name}</td>
                        <td>{money(row.total_amt)}</td>
                        <td>{money(row.advance)}</td>
                        <td>{money(row.balance)}</td>
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

const ewbSliceLabel = {
  expired: "Expired",
  today: "Today",
  next: "Tomorrow",
  d2: "In 2 days",
  week: "In 3–7 days",
};

export function EwbBoard({ board, onSlice }) {
  const rows = board?.rows || [];
  return (
    <table className="ordMgmt">
      <thead>
        <tr>
          <th>Expiry</th>
          <th>Delivered</th>
          <th>Undelivered</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td>{row.label}</td>
            <td><CountFig value={row.delivered} onClick={() => onSlice(row.key, "delivered")} /></td>
            <td className="ordMgmt__sum"><CountFig value={row.undelivered} onClick={() => onSlice(row.key, "undelivered")} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ewbSideLabel = { delivered: "Delivered", undelivered: "Undelivered" };

export function EwbDrill({ open, onClose, start = null }) {
  const slice = start?.slice || "today";
  const side = start?.side === "delivered" ? "delivered" : "undelivered";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchEwbBills({ slice, side })
      .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setError("This list could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slice, side]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <div className="ordHead">
        <div>
          <div className="ordHead__kicker">E-way bill expiry</div>
          <h2>{ewbSliceLabel[slice] || slice} · {ewbSideLabel[side]}</h2>
          <p>
            Each row is an e-way bill. Expiry follows the valid-up-to date. Delivered means the latest delivery note is Delivered. Undelivered is every other docket.
          </p>
        </div>
        <IconButton onClick={onClose} aria-label="Close" size="small"><CloseIcon /></IconButton>
      </div>
      <DialogContent>
        {loading ? <div className="ordState"><CircularProgress size={22} /> Loading e-way bills</div>
          : error ? <div className="ordState">{error}</div>
            : (
              <div className="ordListWrap">
                <div className="ordListMeta">{rows.length.toLocaleString("en-IN")} e-way bill{rows.length === 1 ? "" : "s"}</div>
                <table className="ordList">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>E-way bill</th>
                      <th>Valid up to</th>
                      <th>E-way date</th>
                      <th>Docket</th>
                      <th>Docket date</th>
                      <th>Branch</th>
                      <th>Consignor</th>
                      <th>Consignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={9} className="ordEmpty">No e-way bills in this slice</td></tr>}
                    {rows.map((row, index) => (
                      <tr key={`${row.ewb_no}-${row.docket_no}`}>
                        <td>{index + 1}</td>
                        <td>{row.ewb_no}</td>
                        <td>{showDate(row.valid_upto)}</td>
                        <td>{showDate(row.ewb_date)}</td>
                        <td>{row.docket_no}</td>
                        <td>{showDate(row.docket_date)}</td>
                        <td>{row.docket_loc}</td>
                        <td>{row.cnor_name}</td>
                        <td>{row.cnee_name}</td>
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
