import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  FormField,
  DataTable,
} from "../../components/common/MasterPage";
import { FormControl, MenuItem, Select } from "@mui/material";
import {
  fetchAllBusinessPartners,
  fetchBpTypes,
  saveBusinessPartner as saveBusinessPartnerApi,
  updateBusinessPartner as updateBusinessPartnerApi,
  deleteBusinessPartner as deleteBusinessPartnerApi,
} from "../../utils/businessPartner";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const selectSx = (hasValue) => ({
  fontSize: "14px",
  fontFamily: "inherit",
  color: hasValue ? "#1e293b" : "#cbd5e1",
  background: "#ffffff",
  borderRadius: "8px",
  "& .MuiOutlinedInput-notchedOutline": { border: "1.5px solid #e2e8f0", borderRadius: "8px" },
  "&:hover .MuiOutlinedInput-notchedOutline": { border: "1.5px solid #e2e8f0" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "1.5px solid #a855f7", boxShadow: "0 0 0 3px rgba(168,85,247,0.1)" },
  "& .MuiSelect-select": { padding: "8px 5px" },
});

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
  // KYC
  bp_ind_id_type_1: "", bp_ind_id_no_1: "",
  bp_ind_id_type_2: "", bp_ind_id_no_2: "",
  bp_ind_id_type_3: "", bp_ind_id_no_3: "",
  bp_ind_id_type_4: "", bp_ind_id_no_4: "",
  bp_ind_id_type_5: "", bp_ind_id_no_5: "",
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

function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="formFieldGroup">
      <label>{label}</label>
      <FormControl fullWidth>
        <Select displayEmpty value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} sx={selectSx(!!value)}>
          <MenuItem value="" disabled sx={{ color: "#cbd5e1" }}>{placeholder || `Select ${label}`}</MenuItem>
          {options.map((opt) => (
            <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt}>
              {typeof opt === "object" ? opt.label : opt}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}

export default function BusinessPartnerPage() {
  const [partners, setPartners] = useState([]);
  const [bpTypes, setBpTypes] = useState([]);
  const [divisions, setDivisions] = useState([]);
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

  // Wrapper for FormField's setForm prop — detects which keys changed and marks them dirty
  const setFormTracked = (updater) => {
    const next = typeof updater === "function" ? updater(form) : updater;
    const changed = Object.keys(next).filter((k) => next[k] !== form[k]);
    if (changed.length) {
      setDirtyFields((prev) => {
        const s = new Set(prev);
        changed.forEach((k) => s.add(k));
        return s;
      });
    }
    setForm(next);
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

  useEffect(() => {
    (async () => {
      try {
        const [partnerData, typeData, divisionData] = await Promise.all([
          fetchAllBusinessPartners(),
          fetchBpTypes(),
          fetchAllDivisionsApi(),
        ]);
        setPartners(partnerData);
        setBpTypes(typeData);
        setDivisions(divisionData);
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
          <FormField label="Division Code" name="division_code" form={form} setForm={setFormTracked}
            options={divisionOptions} />
          <FormField label="PAN No" name="bp_pan_no" form={form} setForm={setFormTracked} />
          <FormField label="PAN Name" name="bp_pan_name" form={form} setForm={setFormTracked} />
          <FormField label="BP Name" name="bp_name" form={form} setForm={setFormTracked} />
          <SelectField label="BP Type" name="bp_type" value={form.bp_type} onChange={setField}
            options={bpTypeOptions} placeholder="Select BP Type" />
          <SelectField label="Company Type" name="bp_company_type" value={form.bp_company_type} onChange={setField}
            options={["Private Ltd", "Public Ltd", "Partnership", "Proprietorship", "LLP"]} />
          <FormField label="Registration No" name="bp_registration_no" form={form} setForm={setFormTracked} />
          <FormField label="TAN No" name="bp_tan_no" form={form} setForm={setFormTracked} />
          <SelectField label="Deals With" name="bp_deals_with" value={form.bp_deals_with} onChange={setField}
            options={["Service", "Item", "Both"]} />
        </FormPanel>

        {/* KYC */}
        <FormPanel>
          <SectionHeader title="Identification (KYC)" />
          {[1, 2, 3, 4, 5].map((n) => (
            <>
              <SelectField key={`id_type_${n}`} label={`ID Type ${n}`} name={`bp_ind_id_type_${n}`}
                value={form[`bp_ind_id_type_${n}`]} onChange={setField} options={ID_TYPES} />
              <FormField key={`id_no_${n}`} label={`ID No ${n}`} name={`bp_ind_id_no_${n}`} form={form} setForm={setFormTracked} />
            </>
          ))}
        </FormPanel>

        {/* Document Validity */}
        <FormPanel>
          <SectionHeader title="Document Validity" />
          {[1, 2].map((n) => (
            <>
              <SelectField key={`doc_type_${n}`} label={`Doc Type ${n}`} name={`bp_ind_doc_type_${n}`}
                value={form[`bp_ind_doc_type_${n}`]} onChange={setField} options={DOC_TYPES} />
              <FormField key={`doc_from_${n}`} label="Valid From" name={`bp_ind_doc_${n}_from`} type="date" form={form} setForm={setFormTracked} />
              <FormField key={`doc_to_${n}`} label="Valid To" name={`bp_ind_doc_${n}_to`} type="date" form={form} setForm={setFormTracked} />
            </>
          ))}
        </FormPanel>

        {/* Bank Details */}
        <FormPanel>
          <SectionHeader title="Bank Details" />
          <FormField label="Bank Name" name="bp_bank_name" form={form} setForm={setFormTracked} />
          <FormField label="Account Name" name="bp_acount_name" form={form} setForm={setFormTracked} />
          <FormField label="Account No" name="bp_account_no" form={form} setForm={setFormTracked} />
          <FormField label="IFSC Code" name="bp_ifsc_code" form={form} setForm={setFormTracked} />
        </FormPanel>

        {/* Other Details */}
        <FormPanel>
          <SectionHeader title="Other Details" />
          <FormField label="Credit Days" name="bp_credit_days" type="number" form={form} setForm={setFormTracked} />
          <SelectField label="Status" name="bp_status" value={form.bp_status} onChange={setField}
            options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]} />
          <FormField label="Closed On" name="bp_closed_on" type="date" form={form} setForm={setFormTracked} />
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