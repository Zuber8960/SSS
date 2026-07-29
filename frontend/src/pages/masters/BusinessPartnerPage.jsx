import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { Box, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import {
  fetchAllBusinessPartners,
  fetchBpTypes,
  saveBusinessPartner as saveBusinessPartnerApi,
  updateBusinessPartner as updateBusinessPartnerApi,
  deleteBusinessPartner as deleteBusinessPartnerApi,
} from "../../utils/businessPartner";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchStatesAndCities } from "../../utils/stateCity";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

const ID_TYPES = ["PAN", "AADHAR", "PASSPORT", "DL"];
const DOC_TYPES = ["Agreement", "NDA"];

const emptyForm = {
  record_id: "",
  division_code: "",
  bp_pan_no: "",
  bp_pan_name: "",
  bp_name: "",
  bp_type: "",
  bp_company_type: "",
  bp_registration_no: "",
  bp_tan_no: "",
  bp_deals_with: "",
  bp_addres: "",
  bp_state: "",
  bp_city: "",
  bp_pincode: "",
  bp_gstin: "",
  loc_code: "",
  // KYC
  bp_ind_id_type_1: "", bp_ind_id_no_1: "",
  bp_ind_id_type_2: "", bp_ind_id_no_2: "",
  bp_ind_id_type_3: "", bp_ind_id_no_3: "",
  bp_ind_id_type_4: "", bp_ind_id_no_4: "",
  // Document Validity
  bp_ind_doc_type_1: "", bp_ind_doc_1_from: "", bp_ind_doc_1_to: "",
  bp_ind_doc_type_2: "", bp_ind_doc_2_from: "", bp_ind_doc_2_to: "",
  // Bank
  bp_bank_name: "",
  bp_acount_name: "",
  bp_account_no: "",
  bp_ifsc_code: "",
  // Other
  bp_credit_days: "",
  bp_status: "",
  bp_closed_on: "",
};

const DATE_FORM_FIELDS = ["bp_closed_on", "bp_ind_doc_1_from", "bp_ind_doc_1_to", "bp_ind_doc_2_from", "bp_ind_doc_2_to"];

const mapRowToForm = (row) => {
  const f = { ...emptyForm };
  Object.keys(f).forEach((k) => {
    if (row[k] == null) return;
    if (DATE_FORM_FIELDS.includes(k)) {
      f[k] = String(row[k]).substring(0, 10);
    } else {
      f[k] = String(row[k]);
    }
  });
  f.record_id = row.record_id ?? "";
  return f;
};

function SectionHeader({ title }) {
  return (
    <div style={{ gridColumn: "1 / -1", marginTop: 8, marginBottom: 4, paddingBottom: 6, borderBottom: "1.5px solid #e9e5f0" }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#7e22ce" }}>{title}</h3>
    </div>
  );
}

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value ?? ""} onChange={e => onChange(name, e.target.value)}
        sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt}
            sx={{ fontSize: 13 }}>
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function BusinessPartnerPage() {
  const [partners, setPartners] = useState([]);
  const [bpTypes, setBpTypes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [states, setStates] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [originalRecId, setOriginalRecId] = useState(null);

  const DATE_FIELDS = DATE_FORM_FIELDS;

  const isValidDate = (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirtyFields((prev) => new Set(prev).add(name));
  };


  const clearForm = () => {
    setForm(emptyForm);
    setDirtyFields(new Set());
    setIsEditing(false);
    setOriginalRecId(null);
  };

  const buildPayload = (onlyDirty) => {
    const payload = {};
    const keys = onlyDirty ? Array.from(dirtyFields) : Object.keys(form);
    for (const k of keys) {
      if (k === "record_id" || k === "company_code") continue;
      const val = form[k];
      if (DATE_FIELDS.includes(k)) {
        payload[k] = val && val !== "" ? val : null;
      } else {
        payload[k] = val;
      }
    }
    return payload;
  };

  const savePartner = async () => {
    if (!form.bp_name) { showError("BP Name is required"); return; }
    if (!form.bp_type) { showError("BP Type is required"); return; }

    // Validate all date fields
    let dirtyDates = DATE_FIELDS.filter((f) => dirtyFields.has(f));
    for (const f of dirtyDates) {
      if (form[f] && !isValidDate(form[f])) {
        showError(`Invalid date in "${f.replace(/_/g, " ")}". Use YYYY-MM-DD format.`);
        return;
      }
    }

    try {
      if (isEditing && originalRecId) {
        const payload = buildPayload(true);
        if (Object.keys(payload).length === 0) {
          showError("No changes detected to save.");
          return;
        }
        await updateBusinessPartnerApi(originalRecId, payload);
        const data = await fetchAllBusinessPartners();
        setPartners(data);
        showSuccess("Business Partner updated successfully");
      } else {
        const payload = buildPayload(false);
        await saveBusinessPartnerApi(payload);
        const data = await fetchAllBusinessPartners();
        setPartners(data);
        showSuccess("Business Partner saved successfully");
      }
      clearForm();
    } catch (error) {
      showError(error.message || "Failed to save business partner");
      console.error("Save business partner error:", error);
    }
  };

  const editPartner = (row) => {
    setForm(mapRowToForm(row));
    setDirtyFields(new Set());
    setOriginalRecId(row.record_id);
    setIsEditing(true);
  };

  const deletePartner = (recordId) => {
    showWarning("Confirm Delete", "Are you sure you want to delete this Business Partner?", async () => {
      try {
        await deleteBusinessPartnerApi(recordId);
        setPartners((prev) => prev.filter((x) => x.record_id !== recordId));
        showSuccess("Business Partner deleted successfully");
      } catch (error) {
        showError(error.message || "Failed to delete business partner");
        console.error("Delete business partner error:", error);
      }
    });
  };

  const filteredPartners = searchText
    ? partners.filter((x) =>
        String(x.bp_name ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(x.bp_pan_no ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(x.bp_registration_no ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(x.bp_type_name ?? "").toLowerCase().includes(searchText.toLowerCase())
      )
    : partners;

  const partnerColumns = [
    { key: "bp_name", label: "BP Name" },
    { key: "bp_type_name", label: "BP Type" },
    { key: "bp_pan_no", label: "PAN No" },
    { key: "bp_registration_no", label: "Registration No" },
    { key: "bp_tan_no", label: "TAN No" },
    { key: "bp_bank_name", label: "Bank" },
    { key: "bp_status", label: "Status", render: (row) => row.bp_status === "1" || row.bp_status === 1 ? "Active" : row.bp_status === "0" || row.bp_status === 0 ? "Inactive" : "" },
  ];

  const partnerActions = [
    { label: "Edit", icon: <EditIcon />, onClick: editPartner },
    { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deletePartner(row.record_id) },
  ];

  // BP Type options for dropdown: { value: rec_id, label: rec_name }
  const bpTypeOptions = bpTypes.map((t) => ({ value: String(t.rec_id), label: t.rec_name }));

  // Division options for dropdown: { value: division_code, label: "code - name" }
  const divisionOptions = divisions.map((div) => ({
    value: div.division_code,
    label: `${div.division_code} - ${div.division_name}`,
  }));

  const locationOptions = locations.map((loc) => ({
    value: loc.loc_code,
    label: `${loc.loc_code} - ${loc.loc_name}`,
  }));

  const stateOptions = states.map((s) => ({ value: s.state_name, label: s.state_name }));

  const selectedStateCode = states.find((s) => s.state_name === form.bp_state)?.state_code;
  const cityOptions = allCities
    .filter((c) => c.state_code === selectedStateCode)
    .map((c) => ({ value: c.city_name, label: c.city_name }));

  useEffect(() => {
    (async () => {
      try {
        const [partnerData, typeData, divisionData, locationData, stateCityData] = await Promise.all([
          fetchAllBusinessPartners(),
          fetchBpTypes(),
          fetchAllDivisionsApi(),
          fetchAllLocations(),
          fetchStatesAndCities(),
        ]);
        setPartners(partnerData);
        setBpTypes(typeData);
        setDivisions(divisionData);
        setLocations(locationData);
        setStates(stateCityData.states || []);
        setAllCities(stateCityData.cities || []);
      } catch (err) {
        showError(err.message || "Failed to load data");
        console.error("Load error:", err);
      }
    })();
  }, []);

  return (
    <MainLayout>
      <PageBody title="Business Partner Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: savePartner },
          ]}
          search={{ placeholder: "Search Partner...", value: searchText, onChange: setSearchText }}
        />

        {/* Basic Details */}
        <FormPanel>
          <MuiSelect label="Division Code" name="division_code" value={form.division_code} onChange={setField} options={divisionOptions} />
          <TextField size="small" label="PAN No" fullWidth sx={fieldSx} value={form.bp_pan_no} onChange={e => setField("bp_pan_no", e.target.value)} />
          <TextField size="small" label="PAN Name" fullWidth sx={fieldSx} value={form.bp_pan_name} onChange={e => setField("bp_pan_name", e.target.value)} />
          <TextField size="small" label="BP Name" fullWidth sx={fieldSx} value={form.bp_name} onChange={e => setField("bp_name", e.target.value)} />
          <MuiSelect label="BP Type" name="bp_type" value={form.bp_type} onChange={setField} options={bpTypeOptions} />
          <MuiSelect label="Company Type" name="bp_company_type" value={form.bp_company_type} onChange={setField} options={["Private Ltd", "Public Ltd", "Partnership", "Proprietorship", "LLP"]} />
          <TextField size="small" label="Registration No" fullWidth sx={fieldSx} value={form.bp_registration_no} onChange={e => setField("bp_registration_no", e.target.value)} />
          <TextField size="small" label="TAN No" fullWidth sx={fieldSx} value={form.bp_tan_no} onChange={e => setField("bp_tan_no", e.target.value)} />
          <MuiSelect label="Deals With" name="bp_deals_with" value={form.bp_deals_with} onChange={setField} options={["Service", "Item", "Both"]} />
          <TextField size="small" label="Address" fullWidth sx={fieldSx} value={form.bp_addres} onChange={e => setField("bp_addres", e.target.value)} />
          <MuiSelect label="State" name="bp_state" value={form.bp_state} onChange={(name, val) => { setField(name, val); setField("bp_city", ""); }} options={stateOptions} />
          <MuiSelect label="City" name="bp_city" value={form.bp_city} onChange={setField} options={cityOptions} />
          <TextField size="small" label="Pincode" fullWidth sx={fieldSx} value={form.bp_pincode} onChange={e => setField("bp_pincode", e.target.value)} />
          <TextField size="small" label="GSTIN" fullWidth sx={fieldSx} value={form.bp_gstin} onChange={e => setField("bp_gstin", e.target.value)} />
          <MuiSelect label="Location" name="loc_code" value={form.loc_code} onChange={setField} options={locationOptions} />
        </FormPanel>

        {/* KYC */}
        <FormPanel>
          <SectionHeader title="Identification (KYC)" />
          {[1, 2, 3, 4].map((n) => (
            <Box key={n} sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>ID {n}</Typography>
              <Box sx={{ display: "flex", gap: "6px" }}>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel sx={{ fontSize: 13 }}>Type</InputLabel>
                  <Select
                    label="Type"
                    value={form[`bp_ind_id_type_${n}`] ?? ""}
                    onChange={e => setField(`bp_ind_id_type_${n}`, e.target.value)}
                    sx={{ fontSize: 13 }}
                  >
                    {ID_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Number"
                  fullWidth
                  value={form[`bp_ind_id_no_${n}`] ?? ""}
                  onChange={e => setField(`bp_ind_id_no_${n}`, e.target.value)}
                  sx={{ flex: "1 1 0", minWidth: 0, ...fieldSx }}
                />
              </Box>
            </Box>
          ))}
        </FormPanel>

        {/* Document Validity */}
        <FormPanel>
          <SectionHeader title="Document Validity" />
          {[1, 2].map((n) => (
            <Box key={n} sx={{ display: "contents" }}>
              <MuiSelect label={`Doc Type ${n}`} name={`bp_ind_doc_type_${n}`} value={form[`bp_ind_doc_type_${n}`]} onChange={setField} options={DOC_TYPES} />
              <TextField size="small" label="Valid From" type="date" fullWidth sx={fieldSx} value={form[`bp_ind_doc_${n}_from`]} onChange={e => setField(`bp_ind_doc_${n}_from`, e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" label="Valid To" type="date" fullWidth sx={fieldSx} value={form[`bp_ind_doc_${n}_to`]} onChange={e => setField(`bp_ind_doc_${n}_to`, e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
          ))}
        </FormPanel>

        {/* Bank Details */}
        <FormPanel>
          <SectionHeader title="Bank Details" />
          <TextField size="small" label="Bank Name" fullWidth sx={fieldSx} value={form.bp_bank_name} onChange={e => setField("bp_bank_name", e.target.value)} />
          <TextField size="small" label="Account Name" fullWidth sx={fieldSx} value={form.bp_acount_name} onChange={e => setField("bp_acount_name", e.target.value)} />
          <TextField size="small" label="Account No" fullWidth sx={fieldSx} value={form.bp_account_no} onChange={e => setField("bp_account_no", e.target.value)} />
          <TextField size="small" label="IFSC Code" fullWidth sx={fieldSx} value={form.bp_ifsc_code} onChange={e => setField("bp_ifsc_code", e.target.value)} />
        </FormPanel>

        {/* Other Details */}
        <FormPanel>
          <SectionHeader title="Other Details" />
          <TextField size="small" label="Credit Days" type="number" fullWidth sx={fieldSx} value={form.bp_credit_days} onChange={e => setField("bp_credit_days", e.target.value)} />
          <MuiSelect label="Status" name="bp_status" value={form.bp_status} onChange={setField} options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]} />
          <TextField size="small" label="Closed On" type="date" fullWidth sx={fieldSx} value={form.bp_closed_on} onChange={e => setField("bp_closed_on", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        </FormPanel>

        <DataTable
          columns={partnerColumns}
          rows={filteredPartners}
          getKey={(row) => row.record_id}
          actions={partnerActions}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}