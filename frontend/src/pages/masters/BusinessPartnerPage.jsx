import { useEffect, useRef, useState } from "react";
import { NoteAddIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { Autocomplete, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import {
  fetchAllBusinessPartners,
  fetchBpTypes,
  saveBusinessPartner as saveBusinessPartnerApi,
  updateBusinessPartner as updateBusinessPartnerApi,
  deleteBusinessPartner as deleteBusinessPartnerApi,
  uploadBpDocument,
} from "../../utils/businessPartner";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import { fetchAllLocations } from "../../utils/locationMaster";
import { fetchStatesAndCities } from "../../utils/stateCity";
import useAlert from "../../components/common/UseAlert";
import { compressImageFile } from "../../utils/deliveryNote";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };


// ── Field config arrays ──────────────────────────────────────────────────────
const BASIC_FIELDS = [
  { name: "division_code",      label: "Division Code",   type: "select",  options: "divisionOptions" },
  { name: "bp_pan_no",          label: "PAN No",          type: "text" },
  { name: "bp_pan_name",        label: "PAN Name",        type: "text" },
  { name: "bp_name",            label: "BP Name",         type: "text" },
  { name: "bp_type",            label: "BP Type",         type: "select",  options: "bpTypeOptions" },
  { name: "bp_company_type",    label: "Company Type",    type: "select",  options: ["Private Ltd", "Public Ltd", "Partnership", "Proprietorship", "LLP"] },
  { name: "bp_deals_with",      label: "Deals With",      type: "select",  options: ["Service", "Item", "Both"] },
  { name: "bp_addres",          label: "Address",         type: "text" },
  { name: "bp_state",           label: "State",           type: "state-auto" },
  { name: "bp_city",            label: "City",            type: "city-auto" },
  { name: "bp_pincode",         label: "Pincode",         type: "text" },
  { name: "bp_gstin",           label: "GSTIN",           type: "text" },
  { name: "bp_mobile1",         label: "Mobile No 1",     type: "text" },
  { name: "bp_mobile2",         label: "Mobile No 2",     type: "text" },
  { name: "loc_code",           label: "Location",        type: "select",  options: "locationOptions" },
];

const BANK_FIELDS = [
  { name: "bp_bank_name",   label: "Bank Name",    type: "text" },
  { name: "bp_acount_name", label: "Account Name", type: "text" },
  { name: "bp_account_no",  label: "Account No",   type: "text" },
  { name: "bp_ifsc_code",   label: "IFSC Code",    type: "text" },
];

// ────────────────────────────────────────────────────────────────────────────

const emptyForm = {
  record_id: "",
  division_code: "",
  bp_pan_no: "",
  bp_pan_name: "",
  bp_name: "",
  bp_type: "",
  bp_company_type: "",
  bp_deals_with: "",
  bp_addres: "",
  bp_state: "",
  bp_city: "",
  bp_pincode: "",
  bp_gstin: "",
  bp_mobile1: "",
  bp_mobile2: "",
  loc_code: "",
  bp_ind_id_type_1: "", bp_ind_id_no_1: "",
  bp_ind_id_type_2: "", bp_ind_id_no_2: "",
  bp_ind_id_type_3: "", bp_ind_id_no_3: "",
  bp_ind_id_type_4: "", bp_ind_id_no_4: "",
  bp_ind_doc_type_1: "", bp_ind_doc_1_from: "", bp_ind_doc_1_to: "", bp_ind_doc_1_file: "",
  bp_bank_name: "",
  bp_acount_name: "",
  bp_account_no: "",
  bp_ifsc_code: "",
  bp_credit_days: "",
  bp_status: "1",
  bp_closed_on: "",
};

const OTHER_FIELDS = [
  { name: "bp_credit_days",     label: "Credit Days",     type: "number" },
  { name: "bp_status",          label: "Status",          type: "select", options: [{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }] },
  { name: "bp_closed_on",       label: "Closed On",       type: "date" },
];

const DOC_TYPE_OPTIONS = ["GST Certificate", "PAN Card", "Aadhaar Card", "MSME/Udyam Certificate", "Trade License", "Other"];

const DATE_FORM_FIELDS = ["bp_closed_on", "bp_ind_doc_1_from", "bp_ind_doc_1_to"];

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
  const [stateInput, setStateInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileInput = useRef(null);

  const handleDocUpload = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      // Compress images in-browser first (same as Delivery Update POD upload) —
      // mobile camera photos are often >5MB. Non-image files pass through unchanged.
      const compressed = await compressImageFile(file);
      console.log(
        `Uploading BP document: ${file.name} before compression ==> (${file.size / 1000} kB), after compression ==> (${compressed.size / 1000} kB)`
      );
      const url = await uploadBpDocument(compressed);
      if (!url) throw new Error("Upload endpoint returned no URL");
      setField("bp_ind_doc_1_file", url);
    } catch (err) {
      console.error("Document upload error:", err);
      showError(err.message || `${file.name} could not be uploaded.`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const DATE_FIELDS = DATE_FORM_FIELDS;

  const isValidDate = (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirtyFields((prev) => new Set(prev).add(name));
    if (name === "bp_type") {
      const selectedType = bpTypes.find((t) => String(t.rec_id) === String(value));
      const isCustomer = selectedType?.rec_name?.toLowerCase().includes("customer");
      setShowBankDetails(!isCustomer);
    }
  };

  const clearForm = () => {
    setForm(emptyForm);
    setDirtyFields(new Set());
    setIsEditing(false);
    setOriginalRecId(null);
    setStateInput("");
    setCityInput("");
    setShowBankDetails(false);
    setShowForm(!showForm);
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
      setShowForm(false);
    } catch (error) {
      showError(error.message || "Failed to save business partner");
      console.error("Save business partner error:", error);
    }
  };

  const editPartner = (row) => {
    const mapped = mapRowToForm(row);
    setForm(mapped);
    setDirtyFields(new Set());
    setOriginalRecId(row.record_id);
    setIsEditing(true);
    setStateInput(mapped.bp_state || "");
    setCityInput(mapped.bp_city || "");
    const selectedType = bpTypes.find((t) => String(t.rec_id) === String(mapped.bp_type));
    const isCustomer = selectedType?.rec_name?.toLowerCase().includes("customer");
    setShowBankDetails(!isCustomer);
    setShowForm(true);
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
        String(x.bp_mobile1 ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(x.bp_mobile2 ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
        String(x.bp_type_name ?? "").toLowerCase().includes(searchText.toLowerCase())
      )
    : partners;

  const partnerColumns = [
    { key: "bp_name", label: "BP Name" },
    { key: "bp_type_name", label: "BP Type" },
    { key: "bp_pan_no", label: "PAN No" },
    { key: "bp_mobile1", label: "Mobile No 1" },
    { key: "bp_mobile2", label: "Mobile No 2" },
    { key: "bp_bank_name", label: "Bank" },
    { key: "loc_code", label: "Location", render: (row) => { const loc = locations.find((l) => String(l.loc_code) === String(row.loc_code)); return loc ? `${loc.loc_code} - ${loc.loc_name}` : (row.loc_code ?? ""); } },
    { key: "bp_status", label: "Status", render: (row) => row.bp_status === "1" || row.bp_status === 1 ? "Active" : row.bp_status === "0" || row.bp_status === 0 ? "Inactive" : "" },
  ];

  const partnerActions = [
    { label: "Edit", icon: <EditIcon />, onClick: editPartner },
    { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deletePartner(row.record_id) },
  ];

  const bpTypeOptions   = bpTypes.map((t) => ({ value: String(t.rec_id), label: t.rec_name }));
  const divisionOptions = divisions.map((div) => ({ value: div.division_code, label: `${div.division_code} - ${div.division_name}` }));
  const locationOptions = locations.map((loc) => ({ value: loc.loc_code, label: `${loc.loc_code} - ${loc.loc_name}` }));

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

  // Resolves string option keys to their dynamic arrays
  const resolveOptions = (options) => {
    if (options === "divisionOptions") return divisionOptions;
    if (options === "bpTypeOptions")   return bpTypeOptions;
    if (options === "locationOptions") return locationOptions;
    return options || [];
  };

  // Generic field renderer — driven by field config objects
  const renderField = (f) => {
    const disabled = f.disabledWhenNew ? !isEditing : false;

    switch (f.type) {
      case "select":
        return (
          <MuiSelect
            key={f.name}
            label={f.label}
            name={f.name}
            value={form[f.name]}
            onChange={setField}
            options={resolveOptions(f.options)}
          />
        );
      case "date":
        return (
          <TextField
            key={f.name}
            size="small"
            label={f.label}
            type="date"
            fullWidth
            sx={fieldSx}
            value={form[f.name]}
            onChange={e => setField(f.name, e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={disabled}
          />
        );
      case "number":
        return (
          <TextField
            key={f.name}
            size="small"
            label={f.label}
            type="number"
            fullWidth
            sx={fieldSx}
            value={form[f.name]}
            onChange={e => setField(f.name, e.target.value)}
          />
        );
      case "state-auto":
        return (
          <Autocomplete
            key={f.name}
            size="small"
            options={stateInput.length >= 3 ? states.filter(s => s.state_name.toLowerCase().includes(stateInput.toLowerCase())).map(s => s.state_name) : []}
            value={form.bp_state || null}
            inputValue={stateInput}
            onInputChange={(_, val) => setStateInput(val)}
            onChange={(_, val) => { setField("bp_state", val || ""); setField("bp_city", ""); setCityInput(""); }}
            renderInput={(params) => <TextField {...params} label="State" size="small" sx={fieldSx} />}
            noOptionsText={stateInput.length < 3 ? "Type 3 chars to search" : "No match"}
          />
        );
      case "city-auto":
        return (
          <Autocomplete
            key={f.name}
            size="small"
            freeSolo
            options={cityInput.length >= 1 ? allCities.filter(c => c.state_code === states.find(s => s.state_name === form.bp_state)?.state_code && c.city_name?.toLowerCase().includes(cityInput?.toLowerCase())).map(c => c.city_name) : []}
            value={form.bp_city || null}
            inputValue={cityInput}
            onInputChange={(_, val) => { setCityInput(val); setField("bp_city", val); }}
            onChange={(_, val) => { const v = val || ""; setCityInput(v); setField("bp_city", v); }}
            renderInput={(params) => <TextField {...params} label="City" size="small" sx={fieldSx} />}
            noOptionsText="No match — typed city will be saved"
          />
        );
      default:
        return (
          <TextField
            key={f.name}
            size="small"
            label={f.label}
            fullWidth
            sx={fieldSx}
            value={form[f.name]}
            onChange={e => setField(f.name, e.target.value)}
          />
        );
    }
  };

  return (
    <MainLayout>
      <PageBody title="Business Partner Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            ...(showForm ? [{ label: "Save", icon: <SaveIcon />, onClick: savePartner }] : []),
          ]}
          search={{ placeholder: "Search Partner...", value: searchText, onChange: setSearchText }}
        />

        {showForm && (
          <>
            {/* Basic Details */}
            <FormPanel>
              {BASIC_FIELDS.map(renderField)}
            </FormPanel>

            {/* Bank Details — hidden for Customer type */}
            {showBankDetails && (
              <FormPanel>
                <SectionHeader title="Bank Details" />
                {BANK_FIELDS.map(renderField)}
              </FormPanel>
            )}

            {/* Other Details */}
            <FormPanel>
              <SectionHeader title="Other Details" />
              <Box
                sx={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "nowrap",
                  "& > .MuiFormControl-root": { flex: "1 1 0%", minWidth: 140 },
                  "& > .MuiButton-root": { flex: "0 0 auto" },
                }}
              >
                {OTHER_FIELDS.map(renderField)}
                <MuiSelect
                  label="Document Type"
                  name="bp_ind_doc_type_1"
                  value={form.bp_ind_doc_type_1}
                  onChange={setField}
                  options={DOC_TYPE_OPTIONS}
                />
                <input
                  type="file"
                  hidden
                  ref={docFileInput}
                  onChange={(e) => {
                    handleDocUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => docFileInput.current?.click()}
                  disabled={uploadingDoc}
                  sx={{ textTransform: "none", fontSize: 13, height: 40, whiteSpace: "nowrap" }}
                >
                  {uploadingDoc ? "Uploading..." : "Upload Document"}
                </Button>
                <TextField
                  size="small"
                  label="Uploaded File"
                  sx={fieldSx}
                  value={form.bp_ind_doc_1_file || ""}
                  slotProps={{ input: { readOnly: true } }}
                />
              </Box>
            </FormPanel>
          </>
        )}

        <DataTable
          columns={partnerColumns}
          rows={filteredPartners}
          getKey={(row) => row.record_id}
          actions={partnerActions}
          isHeight={420}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
