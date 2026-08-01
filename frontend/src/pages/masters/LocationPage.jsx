import { useEffect, useState } from "react";
import { NoteAddIcon, SaveIcon, ExportIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
  PageBody,
  PageToolbar,
  FormPanel,
  DataTable,
} from "../../components/common/MasterPage";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { fetchAllLocations, saveLocations, updateLocation as updateLocationApi, deleteLocation as deleteLocationApi } from "../../utils/locationMaster";
import { fetchAllDivisionsApi } from "../../utils/divisionMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 13 }, "& .MuiSelect-select": { fontSize: 13 }, "& .MuiInputLabel-root": { fontSize: 13 } };

function MuiSelect({ label, name, value, onChange, options }) {
  return (
    <FormControl fullWidth size="small" sx={fieldSx}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} size="small" value={value ?? ""} onChange={(e) => onChange(name, e.target.value)} sx={{ fontSize: 13 }}>
        {options.map((opt) => (
          <MenuItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt} sx={{ fontSize: 13 }}>
            {typeof opt === "object" ? opt.label : opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const emptyForm = {
  loc_id: "", loc_code: "", loc_name: "", loc_type: "HO", loc_country: "INDIA",
  loc_address: "", loc_state: "", loc_town: "", loc_postal_code: "",
  loc_opened_on: "", loc_closed_on: "", loc_status: "A",
  parent_loc_code: "", division_code: "", longitude: "", latitude: "",
  mobile_no: "", telephone_no: "",
};

export default function LocationPage() {
  const [locations, setLocations] = useState([]);
  const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [originalLocation, setOriginalLocation] = useState(null);
  const [, setError] = useState("");
  const [, setLoading] = useState(true);
  const [divisions, setDivisions] = useState([]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const clearForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setOriginalLocation(null);
  };

  const saveLocation = async () => {
    if (!form.loc_code) { showError("Location Code is required"); return; }
    if (!form.loc_name) { showError("Location Name is required"); return; }
    const payload = {
      ...form,
      loc_postal_code: form.loc_postal_code ? Number(form.loc_postal_code) : null,
      parent_loc_code: form.parent_loc_code ? Number(form.parent_loc_code) : null,
      mobile_no: form.mobile_no ? Number(form.mobile_no) : null,
      telephone_no: form.telephone_no ? Number(form.telephone_no) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      latitude: form.latitude ? Number(form.latitude) : null,
      loc_code: form.loc_code ? form.loc_code : null,
    };
    try {
      if (isEditing && originalLocation?.loc_code) {
        await updateLocationApi(originalLocation.loc_code, payload);
        setLocations((prev) => prev.map((loc) => loc.loc_code === originalLocation.loc_code ? payload : loc));
        showSuccess("Location updated successfully");
      } else {
        await saveLocations(payload);
        setLocations((prev) => [...prev, payload]);
        showSuccess("Location saved successfully");
      }
      clearForm();
    } catch (error) {
      showError(error.message || "Failed to save location");
      console.error("Save location error:", error);
    }
  };

  const editLocation = (row) => {
    setForm(row);
    setOriginalLocation(row);
    setIsEditing(true);
  };

  const deleteLocation = async (locCode) => {
    showWarning("Confirm Delete", "Delete Location ?", async () => {
      try {
        setLoading(true);
        await deleteLocationApi(locCode);
        setLocations((prev) => prev.filter((x) => x.loc_code !== locCode));
        showSuccess("Location deleted successfully");
      } catch (error) {
        showError(error.message || "Failed to delete location");
        console.error("Delete location error:", error);
      } finally {
        setLoading(false);
      }
    });
  };

  const filteredLocations = searchText ? locations.filter(
    (x) => x.loc_code?.toLowerCase().includes(searchText.toLowerCase()) ||
      x.loc_name?.toLowerCase().includes(searchText.toLowerCase())
  ) : locations;

  const locationColumns = [
    { key: "loc_code", label: "Location Code" },
    { key: "loc_name", label: "Location Name" },
    { key: "loc_type", label: "Type" },
    { key: "loc_state", label: "State" },
    { key: "loc_town", label: "Town" },
    { key: "loc_status", label: "Status" },
  ];

  useEffect(() => {
    fetchAllDivisionsApi().then(setDivisions).catch((err) => console.error("Error loading divisions:", err));
  }, []);

  useEffect(() => {
    const loadLocationAtMount = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAllLocations();
        setLocations(data);
      } catch (err) {
        setError(err.message || "Failed to load locations");
        console.error("Error loading locations:", err);
      } finally {
        setLoading(false);
      }
    };
    loadLocationAtMount();
  }, [locations]);

  const divisionOptions = divisions.map((div) => ({
    label: `${div.division_code} - ${div.division_name}`,
    value: div.division_code,
  }));

  return (
    <MainLayout>
      <PageBody title="Location Master">
        <PageToolbar
          actions={[
            { label: "New", icon: <NoteAddIcon />, onClick: clearForm },
            { label: "Save", icon: <SaveIcon />, onClick: saveLocation },
            { label: "Export", icon: <ExportIcon />, onClick: () => alert("Export not implemented yet") },
          ]}
          search={{ placeholder: "Search Location...", value: searchText, onChange: setSearchText }}
        />

        <FormPanel>
          <TextField size="small" label="Location Code" fullWidth sx={fieldSx}
            value={form.loc_code} onChange={(e) => setField("loc_code", e.target.value)} />
          <TextField size="small" label="Location Name" fullWidth sx={fieldSx}
            value={form.loc_name} onChange={(e) => setField("loc_name", e.target.value)} />
          <MuiSelect label="Location Type" name="loc_type" value={form.loc_type} onChange={setField}
            options={["HO", "RO", "ZO", "AO", "BRANCH", "WAREHOUSE", "YARD"]} />
          <TextField size="small" label="Country" fullWidth sx={fieldSx}
            value={form.loc_country} onChange={(e) => setField("loc_country", e.target.value)} />
          <TextField size="small" label="Address" fullWidth sx={fieldSx}
            value={form.loc_address} onChange={(e) => setField("loc_address", e.target.value)} />
          <TextField size="small" label="State" fullWidth sx={fieldSx}
            value={form.loc_state} onChange={(e) => setField("loc_state", e.target.value)} />
          <TextField size="small" label="Town / City" fullWidth sx={fieldSx}
            value={form.loc_town} onChange={(e) => setField("loc_town", e.target.value)} />
          <TextField size="small" label="Postal Code" fullWidth sx={fieldSx}
            value={form.loc_postal_code} onChange={(e) => setField("loc_postal_code", e.target.value)} />
          <TextField size="small" label="Opened On" type="date" fullWidth sx={fieldSx}
            value={form.loc_opened_on} onChange={(e) => setField("loc_opened_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Closed On" type="date" fullWidth sx={fieldSx}
            value={form.loc_closed_on} onChange={(e) => setField("loc_closed_on", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!isEditing} />
          <MuiSelect label="Status" name="loc_status" value={form.loc_status} onChange={setField}
            options={[{ label: "Active", value: "A" }, { label: "Inactive", value: "I" }]} />
          <MuiSelect label="Division Code" name="division_code" value={form.division_code} onChange={setField}
            options={divisionOptions} />
          <TextField size="small" label="Parent Location Code" fullWidth sx={fieldSx}
            value={form.parent_loc_code} onChange={(e) => setField("parent_loc_code", e.target.value)} />
          <TextField size="small" label="Longitude" fullWidth sx={fieldSx}
            value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} />
          <TextField size="small" label="Latitude" fullWidth sx={fieldSx}
            value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} />
          <TextField size="small" label="Mobile No" fullWidth sx={fieldSx}
            value={form.mobile_no} onChange={(e) => setField("mobile_no", e.target.value)} />
          <TextField size="small" label="Telephone No" fullWidth sx={fieldSx}
            value={form.telephone_no} onChange={(e) => setField("telephone_no", e.target.value)} />
        </FormPanel>

        <DataTable
          columns={locationColumns}
          rows={filteredLocations}
          getKey={(row) => row.loc_code}
          actions={[
            { label: "Edit", icon: <EditIcon />, onClick: editLocation },
            { label: "Delete", icon: <DeleteIcon />, onClick: (row) => deleteLocation(row.record_id) },
          ]}
        />
      </PageBody>
      <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
    </MainLayout>
  );
}
