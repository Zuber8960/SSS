import { useEffect, useState } from "react";
import { ClearIcon, SaveIcon, EditIcon, DeleteIcon } from "../../components/common/icons";
import MainLayout from "../../layouts/MainLayout";
import {
    PageBody,
    PageToolbar,
    FormPanel,
    DataTable,
} from "../../components/common/MasterPage";
import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { fetchAllLocations } from "../../utils/locationMaster";
import {
    fetchTownsByLocation,
    addTownToLocation,
    updateTownLocation,
    deleteTownFromLocation,
} from "../../utils/townMaster";
import useAlert from "../../components/common/UseAlert";
import CommonAlertDialog from "../../components/common/CommonAlertDialog";

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13 },
    "& .MuiSelect-select": { fontSize: 13 },
    "& .MuiInputLabel-root": { fontSize: 13 },
};

// India boundary limits (verified: India spans approx 8°4'N–37°6'N latitude
// and 68°7'E–97°25'E longitude as per Google Maps / Survey of India)
const INDIA_LAT_MIN = 8.1;
const INDIA_LAT_MAX = 37.1;
const INDIA_LON_MIN = 68.1;
const INDIA_LON_MAX = 97.4;

const isValidNumber = (value) => value !== "" && value !== null && !isNaN(Number(value));

const emptyForm = {
    loc_code: "",
    town_name: "",
    latitude: "",
    longitude: "",
    old_town_name: "",
    old_loc_code: "",
};

function MuiSelect({ label, name, value, onChange, options }) {
    return (
        <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>{label}</InputLabel>
            <Select
                label={label}
                size="small"
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

export default function AddTown() {
    const [locations, setLocations] = useState([]);
    const [towns, setTowns] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [searchText, setSearchText] = useState("");
    const { dialog, closeAlert, showSuccess, showError, showWarning } = useAlert();

    const setField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const clearForm = () => {
        setForm({
            loc_code: selectedLocation,
            town_name: "",
            latitude: "",
            longitude: "",
            old_town_name: "",
            old_loc_code: "",
        });
        setIsEditing(false);
    };

    useEffect(() => {
        const loadLocations = async () => {
            try {
                const data = await fetchAllLocations();
                const list = data || [];
                setLocations(list);
                if (!selectedLocation && list.length > 0) {
                    setSelectedLocation(list[0].loc_code);
                    setForm((prev) => ({ ...prev, loc_code: list[0].loc_code }));
                }
            } catch (error) {
                console.error("Error loading locations:", error);
                showError(error.message || "Failed to load locations");
            }
        };

        loadLocations();
    }, [selectedLocation]);

    useEffect(() => {
        const loadTowns = async () => {
            if (!selectedLocation) {
                setTowns([]);
                return;
            }

            try {
                const data = await fetchTownsByLocation(selectedLocation);
                setTowns(data || []);
            } catch (error) {
                console.error("Error loading towns:", error);
                showError(error.message || "Failed to load towns");
            }
        };

        loadTowns();
    }, [selectedLocation]);

    const saveTown = async () => {
        const locCode = form.loc_code || selectedLocation;
        const townName = form.town_name?.trim().toUpperCase();
        const latitude = form.latitude?.toString().trim();
        const longitude = form.longitude?.toString().trim();

        if (!locCode) {
            showError("Please select a location");
            return;
        }

        if (!townName) {
            showError("Town name is required");
            return;
        }

        if (latitude === "" || latitude === null || latitude === undefined) {
            showError("Latitude is required");
            return;
        }

        if (longitude === "" || longitude === null || longitude === undefined) {
            showError("Longitude is required");
            return;
        }

        if (!isValidNumber(latitude)) {
            showError("Latitude must be a valid number");
            return;
        }

        if (!isValidNumber(longitude)) {
            showError("Longitude must be a valid number");
            return;
        }

        if (latitude !== "" && (Number(latitude) < INDIA_LAT_MIN || Number(latitude) > INDIA_LAT_MAX)) {
            showError(`Latitude must be within India's boundary (${INDIA_LAT_MIN} to ${INDIA_LAT_MAX})`);
            return;
        }

        if (longitude !== "" && (Number(longitude) < INDIA_LON_MIN || Number(longitude) > INDIA_LON_MAX)) {
            showError(`Longitude must be within India's boundary (${INDIA_LON_MIN} to ${INDIA_LON_MAX})`);
            return;
        }

        try {
            if (isEditing && form.old_town_name) {
                const fromLoc = form.old_loc_code || selectedLocation;
                await updateTownLocation(form.old_town_name, fromLoc, locCode, townName, latitude, longitude);
                showSuccess("Town location updated successfully");

            } else {
                await addTownToLocation(locCode, townName, latitude, longitude);
                showSuccess("Town added successfully");
            }

            setSelectedLocation(locCode);
            const refreshed = await fetchTownsByLocation(locCode);
            setTowns(refreshed || []);
            clearForm();
        } catch (error) {
            console.error("Save town error:", error);
            showError(error.message || "Failed to save town");
        }
    };

    const editTown = (row) => {
        const locCode = row.loc_code || selectedLocation;
        setSelectedLocation(locCode);
        setForm({
            loc_code: locCode,
            town_name: row.town_name || "",
            latitude: row.latitude ?? "",
            longitude: row.longitude ?? "",
            old_town_name: row.town_name || "",
            old_loc_code: locCode,
        });
        setIsEditing(true);
    };

    const deleteTown = async (row) => {
        const locCode = row.loc_code || selectedLocation;
        const townName = row.town_name || "";

        if (!townName) return;

        showWarning(
            "Confirm Delete",
            `Delete town "${townName}" from location ${locCode}?`,
            async () => {
                try {
                    await deleteTownFromLocation(locCode, townName);
                    setTowns((prev) => prev.filter((item) => !(item.town_name === townName && item.loc_code === locCode)));
                    showSuccess("Town deleted successfully");
                    if (selectedLocation === locCode) {
                        clearForm();
                    }
                } catch (error) {
                    console.error("Delete town error:", error);
                    showError(error.message || "Failed to delete town");
                }
            }
        );
    };

    const filteredTowns = searchText
        ? towns.filter((town) => {
            const locatedText = (town.loc_code || "").toLowerCase();
            const nameText = (town.town_name || "").toLowerCase();
            const query = searchText.toLowerCase();
            return locatedText.includes(query) || nameText.includes(query);
        })
        : towns;

    return (
        <MainLayout>
            <PageBody title="Add Town">
                <PageToolbar
                    actions={[
                        { label: "New", icon: <ClearIcon />, onClick: clearForm },
                        { label: "Save", icon: <SaveIcon />, onClick: saveTown },
                    ]}
                    search={{ placeholder: "Search Town...", value: searchText, onChange: setSearchText }}
                />

                <FormPanel columns={2}>
                    <MuiSelect
                        label="Location"
                        name="loc_code"
                        value={form.loc_code || selectedLocation}
                        onChange={(field, value) => {
                            setSelectedLocation(value);
                            setField(field, value);
                        }}
                        options={locations.map((item) => ({
                            label: `${item.loc_code} - ${item.loc_name}`,
                            value: item.loc_code,
                        }))}
                    />
                    <TextField
                        size="small"
                        label="Town Name"
                        fullWidth
                        sx={fieldSx}
                        value={form.town_name}
                        onChange={(e) => setField("town_name", e.target.value.toUpperCase())}
                    />
                    <TextField
                        size="small"
                        label="Latitude"
                        fullWidth
                        sx={fieldSx}
                        type="number"
                        inputProps={{ step: "any", min: INDIA_LAT_MIN, max: INDIA_LAT_MAX }}
                        value={form.latitude}
                        onChange={(e) => setField("latitude", e.target.value)}
                        helperText="India: 8.1 to 37.1"
                        FormHelperTextProps={{ sx: { fontSize: 11 } }}
                    />
                    <TextField
                        size="small"
                        label="Longitude"
                        fullWidth
                        sx={fieldSx}
                        type="number"
                        inputProps={{ step: "any", min: INDIA_LON_MIN, max: INDIA_LON_MAX }}
                        value={form.longitude}
                        onChange={(e) => setField("longitude", e.target.value)}
                        helperText="India: 68.1 to 97.4"
                        FormHelperTextProps={{ sx: { fontSize: 11 } }}
                    />
                </FormPanel>

                <DataTable
                    columns={[
                        { key: "town_name", label: "Town Name" },
                        { key: "loc_code", label: "Location Code" },
                        { key: "latitude", label: "Latitude" },
                        { key: "longitude", label: "Longitude" },
                    ]}
                    rows={filteredTowns}
                    getKey={(row) => `${row.loc_code}-${row.town_name}`}
                    actions={[
                        { label: "Edit", icon: <EditIcon />, onClick: editTown },
                        { label: "Delete", icon: <DeleteIcon />, onClick: deleteTown },
                    ]}
                    isHeight={420}
                />
            </PageBody>
            <CommonAlertDialog dialog={dialog} onClose={closeAlert} />
        </MainLayout>
    );
}
