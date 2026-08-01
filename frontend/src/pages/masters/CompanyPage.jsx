import { useState, useEffect } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import {
  Autocomplete,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import useAlert from "../../components/common/UseAlert";
import {
  fetchAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../../utils/companyMaster";
import { fetchStatesAndCities } from "../../utils/stateCity";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        sx={{ fontSize: 13 }}
      >
        {options.map((opt) => (
          <MenuItem
            key={typeof opt === "object" ? opt.value : opt}
            value={typeof opt === "object" ? opt.value : opt}
            sx={{ fontSize: 13 }}
          >
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const emptyForm = {
  rec_id: "",
  company_name: "",
  regoff_address: "",
  regoff_state_code: "",
  regoff_city_code: "",
  regoff_pincode_code: "",
  mobile_no: "",
  email_id: "",
  website: "",
  pan_no: "",
  gstin_no: "",
  tan_no: "",
  opened_on: "",
  closed_on: "",
  status: "Active",
};

export default function CompanyPage() {
  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalCompany, setOriginalCompany] = useState(null);
  const [states, setStates] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [stateInput, setStateInput] = useState("");
  const [cityInput, setCityInput] = useState("");

  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [form, setForm] = useState({ ...emptyForm });

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const clearForm = () => {
    setForm({ ...emptyForm });
    setIsEditing(false);
    setOriginalCompany(null);
    setStateInput("");
    setCityInput("");
  };

  const saveCompany = async () => {
    if (!form.company_name) {
      showError("Company Name is required");
      return;
    }
    const payload = {
      ...form,
      status: form.status === "Active" ? "A" : "I",
      closed_on: form.closed_on || null,
      opened_on: form.opened_on || null,
    };
    try {
      if (isEditing && originalCompany?.rec_id) {
        const updated = await updateCompany(originalCompany.rec_id, payload);
        const updatedRow = Array.isArray(updated) ? updated[0] : updated;
        setCompanies((prev) =>
          prev.map((c) => (c.rec_id === originalCompany.rec_id ? updatedRow : c))
        );
        showSuccess("Company updated successfully");
      } else {
        delete payload.rec_id;
        const created = await createCompany({ ...payload });
        setCompanies((prev) => [...prev, ...(Array.isArray(created) ? created : [created])]);
        showSuccess("Company created successfully");
      }
      clearForm();
    } catch (err) {
      setError(err.message || "Failed to save company");
      showError(err.message || "Failed to save company");
      console.error("Save company error:", err);
    }
  };

  const editCompany = (row) => {
    setForm(row);
    setOriginalCompany(row);
    setIsEditing(true);
    setStateInput(row.regoff_state_code || "");
    setCityInput(row.regoff_city_code || "");
  };

  const handleDeleteCompany = (rec_id) => {
    showWarning("Delete Company", "Are you sure you want to delete this company?", async () => {
      try {
        await deleteCompany(rec_id);
        setCompanies((prev) => prev.filter((x) => x.rec_id !== rec_id));
        showSuccess("Company deleted successfully");
      } catch (err) {
        setError(err.message || "Failed to delete company");
        showError(err.message || "Failed to delete company");
        console.error("Delete company error:", err);
      }
    });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [companyData, stateCityData] = await Promise.all([
          fetchAllCompanies(),
          fetchStatesAndCities(),
        ]);
        setCompanies(companyData);
        setStates(stateCityData.states || []);
        setAllCities(stateCityData.cities || []);
      } catch (err) {
        setError(err.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredCompanies = companies.filter((x) =>
    x.company_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredCities = cityInput.length >= 1
    ? allCities
        .filter(
          (c) =>
            c.state_code === states.find((s) => s.state_name === form.regoff_state_code)?.state_code &&
            c.city_name?.toLowerCase().includes(cityInput.toLowerCase())
        )
        .map((c) => c.city_name)
    : [];

  const companyColumns = [
    { key: "company_name", label: "Company" },
    { key: "regoff_state_code", label: "State" },
    { key: "regoff_city_code", label: "City" },
    { key: "status", label: "Status" },
  ];

  const companyActions = [
    { label: "Edit", icon: <EditIcon />, onClick: editCompany },
    { label: "Delete", icon: <DeleteIcon />, onClick: (row) => handleDeleteCompany(row.rec_id) },
  ];

  return (
    <MainLayout>
      <PageBody title="Company Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveCompany },
            { label: "Export", icon: <ExportIcon />, onClick: () => alert("Export not implemented yet") },
          ]}
          search={{ placeholder: "Search Company...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <TextField size="small" label="Company Name" fullWidth sx={fieldSx}
            value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} />

          <TextField size="small" label="Address" fullWidth sx={fieldSx}
            value={form.regoff_address} onChange={(e) => setField("regoff_address", e.target.value)} />

          <Autocomplete
            size="small"
            options={
              stateInput.length >= 3
                ? states
                    .filter((s) => s.state_name.toLowerCase().includes(stateInput.toLowerCase()))
                    .map((s) => s.state_name)
                : []
            }
            value={form.regoff_state_code || null}
            inputValue={stateInput}
            onInputChange={(_, val) => setStateInput(val)}
            onChange={(_, val) => {
              setField("regoff_state_code", val || "");
              setField("regoff_city_code", "");
              setCityInput("");
            }}
            renderInput={(params) => <TextField {...params} label="State" size="small" sx={fieldSx} />}
            noOptionsText={stateInput.length < 3 ? "Type 3 chars to search" : "No match"}
          />

          <Autocomplete
            size="small"
            freeSolo
            options={filteredCities}
            value={form.regoff_city_code || null}
            inputValue={cityInput}
            onInputChange={(_, val) => { setCityInput(val); setField("regoff_city_code", val); }}
            onChange={(_, val) => { const v = val || ""; setCityInput(v); setField("regoff_city_code", v); }}
            renderInput={(params) => <TextField {...params} label="City" size="small" sx={fieldSx} />}
            noOptionsText="No match — typed city will be saved"
          />

          <TextField size="small" label="Pincode" fullWidth sx={fieldSx}
            value={form.regoff_pincode_code} onChange={(e) => setField("regoff_pincode_code", e.target.value)} />

          <TextField size="small" label="Phone" fullWidth sx={fieldSx}
            value={form.mobile_no} onChange={(e) => setField("mobile_no", e.target.value)} />

          <TextField size="small" label="Email" fullWidth sx={fieldSx}
            value={form.email_id} onChange={(e) => setField("email_id", e.target.value)} />

          <TextField size="small" label="Website" fullWidth sx={fieldSx}
            value={form.website} onChange={(e) => setField("website", e.target.value)} />

          <TextField size="small" label="PAN No" fullWidth sx={fieldSx}
            value={form.pan_no} onChange={(e) => setField("pan_no", e.target.value)} />

          <TextField size="small" label="GST No" fullWidth sx={fieldSx}
            value={form.gstin_no} onChange={(e) => setField("gstin_no", e.target.value)} />

          <TextField size="small" label="TAN No" fullWidth sx={fieldSx}
            value={form.tan_no} onChange={(e) => setField("tan_no", e.target.value)} />

          <TextField size="small" label="Opened On" type="date" fullWidth sx={fieldSx}
            value={form.opened_on} onChange={(e) => setField("opened_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />

          <TextField size="small" label="Closed On" type="date" fullWidth sx={fieldSx}
            value={form.closed_on} onChange={(e) => setField("closed_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!isEditing} />

          <MuiSelect label="Status" name="status" value={form.status}
            onChange={setField} options={["Active", "Inactive"]} />
        </FormPanel>

        <DataTable
          columns={companyColumns}
          rows={filteredCompanies}
          getKey={(row) => row.rec_id}
          actions={companyActions}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
