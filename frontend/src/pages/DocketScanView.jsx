import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicDocketByDocketNo } from "../utils/docket";
import useAlert from "../components/common/UseAlert";
import CommonAlertDialog from "../components/common/CommonAlertDialog";
import moment from "moment";

const fmtDate = (val) => {
  if (!val) return "";
  const m = moment(val);
  return m.isValid() ? m.format("DD-MM-YYYY") : val;
};

const fmtAmt = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

export default function DocketScanView() {
  const { docketNo } = useParams();
  const [docket, setDocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError, dialog, closeAlert } = useAlert();

  useEffect(() => {
    const loadDocket = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching docket:", docketNo);
        const data = await fetchPublicDocketByDocketNo(docketNo);
        console.log("Fetched data:", data);
        if (data) {
          setDocket(data);
          setError(null);
        } else {
          setError("Docket not found");
          setDocket(null);
        }
      } catch (err) {
        console.error("Error fetching docket:", err);
        setError(err.message || "Failed to fetch docket");
        setDocket(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (docketNo) {
      loadDocket();
    } else {
      setIsLoading(false);
      setError("No docket number provided");
    }
  }, [docketNo]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "18px", color: "#4a3466", background: "#f8f6ff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "20px", fontWeight: "600" }}>Loading docket details...</div>
        </div>
      </div>
    );
  }

  if (error || !docket) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8f6ff" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2 style={{ color: "#d32f2f", marginBottom: "10px", fontWeight: "700" }}>Error</h2>
          <p style={{ fontSize: "16px", color: "#4a3466", fontWeight: "600" }}>{error || "Docket not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f8f6ff", minHeight: "100vh", padding: "20px", fontWeight: "600", color: "#4a3466" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", fontWeight: "600", color: "#4a3466" }}>
        <div style={{ background: "linear-gradient(135deg, #f6f3ff 0%, #f0ecf9 100%)", borderRadius: "12px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.1)", marginBottom: "20px", padding: "20px", border: "1px solid #e9e5f0" }}>
          <h1 style={{ margin: "0 0 5px 0", fontSize: "24px", fontWeight: "700", color: "#4a3466" }}>Consignment Details</h1>
          <p style={{ margin: 0, color: "#6b5480", fontSize: "16px", fontWeight: "600" }}>Docket No: <strong style={{ color: "#7e22ce" }}>{docket.docket_no}</strong></p>
        </div>

        {/* Consignor & Consignee */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Consignor</h3>
            <p style={{ margin: "5px 0", fontWeight: "600", color: "#4a3466" }}><strong>{docket.cnor_name || "-"}</strong></p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>{docket.cnor_address || "-"}</p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>
              {[docket.cnor_city, docket.cnor_state, docket.cnor_pincode].filter(Boolean).join(", ") || "-"}
            </p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>GSTIN: {docket.cnor_gstin || "-"}</p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>Mob: {docket.cnor_mob || "-"}</p>
          </div>

          <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Consignee</h3>
            <p style={{ margin: "5px 0", fontWeight: "600", color: "#4a3466" }}><strong>{docket.cnee_name || "-"}</strong></p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>{docket.cnee_address || "-"}</p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>
              {[docket.cnee_city, docket.cnee_state, docket.cnee_pincode].filter(Boolean).join(", ") || "-"}
            </p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>GSTIN: {docket.cnee_gstin || "-"}</p>
            <p style={{ margin: "5px 0", fontSize: "13px", fontWeight: "600", color: "#4a3466" }}>Mob: {docket.cnee_mob || "-"}</p>
          </div>
        </div>

        {/* Route Details */}
        <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Route & Shipment Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>From Location</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_loc || "-"} - {docket.docket_pickup_town || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>To Location</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_to_loc || "-"} - {docket.docket_dly_town || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Docket Date</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{fmtDate(docket.docket_date) || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Transit Type</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_transit_type || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Load Type</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_load_type || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Pay Type</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_pay_type || "-"}</p>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Package Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Actual Weight</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_act_wt || "-"} Kg</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Charge Weight</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_chrg_wt || "-"} Kg</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Total Packages</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_tot_pkgs || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Cartons</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_crtns || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Bundles</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_bndls || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Bags</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_bags || "-"}</p>
            </div>
          </div>
        </div>

        {/* Goods Details */}
        <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Goods Details</h3>
          <div>
            <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Group</label>
            <p style={{ margin: "5px 0 15px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_goods_grp || "-"}</p>
          </div>
          <div>
            <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Sub Group</label>
            <p style={{ margin: "5px 0 15px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_goods_subgrp || "-"}</p>
          </div>
          <div>
            <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Description</label>
            <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_goods_desc || "-"}</p>
          </div>
        </div>

        {/* Invoice Details */}
        <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Invoice No</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_inv_no || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Invoice Date</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{fmtDate(docket.docket_inv_date) || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Invoice Value</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>₹ {fmtAmt(docket.docket_inv_value)}</p>
            </div>
          </div>
        </div>

        {/* Rate & Charges */}
        <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rate & Charges</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Rate</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>₹ {fmtAmt(docket.docket_rate)}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Rate UOM</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_rate_uom || "-"}</p>
            </div>
            <div>
              <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Total Amount</label>
              <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>₹ {fmtAmt(docket.docket_tot_amt)}</p>
            </div>
          </div>
        </div>

        {/* Insurance Details */}
        {docket.docket_risk && (
          <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Insurance Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
              <div>
                <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Risk</label>
                <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_risk || "-"}</p>
              </div>
              <div>
                <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Insurance Company</label>
                <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_insurance_co || "-"}</p>
              </div>
              <div>
                <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Policy No</label>
                <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_insurance_no || "-"}</p>
              </div>
              <div>
                <label style={{ fontWeight: "700", fontSize: "12px", color: "#4a3466", textTransform: "uppercase", letterSpacing: "0.3px" }}>Sum Insured</label>
                <p style={{ margin: "5px 0", fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>₹ {fmtAmt(docket.docket_insurance_amt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Remarks */}
        {docket.docket_remark && (
          <div style={{ background: "#fffefe", border: "1px solid #e9e5f0", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(126, 34, 206, 0.06)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#7e22ce", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Remarks</h3>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#4a3466" }}>{docket.docket_remark}</p>
          </div>
        )}
        <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
      </div>
    </div>
  );
}
