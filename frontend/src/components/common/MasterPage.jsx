import { useState, useEffect } from "react";
import { DataGrid, useGridApiContext, useGridApiRef } from "@mui/x-data-grid";
import { Box, Button, FormControl, InputLabel, Select, MenuItem, IconButton, TextField, Tooltip } from "@mui/material";
import { getDateFormat } from "../../utils/tenantService";

function DateEditCell(props) {
  const { id, field, value } = props;
  const apiRef = useGridApiContext();
  // Normalise to YYYY-MM-DD for the input[type=date]
  const toInputFmt = (v) => {
    if (!v) return "";
    // try MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    const fmts = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
    for (const f of fmts) {
      const m = new Date(
        f === "MM/DD/YYYY" ? v : f === "DD/MM/YYYY"
          ? v.split("/").reverse().join("-") : v
      );
      if (!isNaN(m)) {
        const y = m.getFullYear();
        const mo = String(m.getMonth() + 1).padStart(2, "0");
        const d = String(m.getDate()).padStart(2, "0");
        return `${y}-${mo}-${d}`;
      }
    }
    return v;
  };
  const handleChange = (e) => {
    const raw = e.target.value; // YYYY-MM-DD from input[type=date]
    if (!raw) return;
    const [y, mo, d] = raw.split("-");
    const fmt = getDateFormat();
    const formatted = fmt
      .replace("YYYY", y).replace("MM", mo).replace("DD", d);
    apiRef.current.setEditCellValue({ id, field, value: formatted });
    apiRef.current.stopCellEditMode({ id, field });
  };
  return (
    <input
      type="date"
      defaultValue={toInputFmt(value)}
      onChange={handleChange}
      style={{ width: "100%", border: "none", outline: "none", fontSize: 14, padding: "0 8px" }}
      autoFocus
    />
  );
}

export function ToggleSwitch({ checked, onChange, labelOn, labelOff, size = "default" }) {
  const label = checked ? labelOn : labelOff;
  const wrapperClass = [
    "toggleSwitch",
    checked ? "toggleSwitch--on" : "",
    size === "small" ? "toggleSwitch--small" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass} onClick={onChange}>
      <div className={`toggleSwitch__track${checked ? " toggleSwitch__track--on" : ""}`}>
        <div className="toggleSwitch__thumb" />
      </div>
      {label && (
        <span className={`toggleSwitch__label${checked ? " toggleSwitch__label--on" : ""}`}>
          {label}
        </span>
      )}
    </div>
  );
}
import { usePageTitle } from "../../contexts/PageTitleContext";
import "../../styles/MasterPage.css";

// Dropdown edit cell that commits immediately on selection (no blur required)
function InstantSelectEditCell({ id, field, value, colDef }) {
  const apiRef = useGridApiContext();
  const [open, setOpen] = useState(true);

  const handleChange = (e) => {
    apiRef.current.setEditCellValue({ id, field, value: e.target.value });
    apiRef.current.stopCellEditMode({ id, field });
  };

  const handleClose = () => {
    setOpen(false);
    apiRef.current.stopCellEditMode({ id, field });
  };

  return (
    <Select
      value={value ?? ""}
      onChange={handleChange}
      onClose={handleClose}
      size="small"
      fullWidth
      autoFocus
      open={open}
    >
      {colDef.valueOptions?.map((opt) => (
        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
      ))}
    </Select>
  );
}

export function PageBody({ title, children }) {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    if (title) setPageTitle(title);
  }, [title, setPageTitle]);
  return (
    <div className="pageBody">
      {children}
    </div>
  );
}

export function PageToolbar({ actions, search }) {
  return (
    <div className="pageToolbar" style={{ alignItems: "center" }}>
      {actions.map((action) => (
        <Tooltip key={action.label} title={action.label}>
          <IconButton
            onClick={action.onClick}
            size="small"
            sx={{
              color: action.color === "error" ? "#dc2626" : "#7e22ce",
              background: action.active ? (action.color === "error" ? "#fee2e2" : "#f3e8ff") : "transparent",
              "&:hover": { background: action.color === "error" ? "#fee2e2" : "#f3e8ff" },
            }}
          >
            {action.icon}
          </IconButton>
        </Tooltip>
      ))}
      {search && (
        <input
          type="text"
          placeholder={search.placeholder}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          className="searchBox"
          style={{ marginLeft: "auto", marginBottom: 0, padding: "10px 16px" }}
        />
      )}
    </div>
  );
}

export function SearchBox({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="searchBox"
    />
  );
}

export function FormPanel({ children, columns, flex, nowrap }) {
  let className = "formGrid";
  if (nowrap) className = "formGridFlexNowrap";
  else if (flex) className = "formGridFlex";
  return (
    <div className="formPanel">
      <div
        className={className}
        style={!flex && !nowrap && columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function FormField({
  label,
  name,
  form,
  setForm,
  type = "text",
  options,
  disabled = false,
  onKeyDown,
  onBlur,
  required = false,
}) {
  const handleChange = (fieldName, value) => setForm({ ...form, [fieldName]: value });

  if (options) {
    return (
      <MuiSelectField
        label={label}
        name={name}
        value={form[name]}
        onChange={handleChange}
        options={options}
        disabled={disabled}
        required={required}
      />
    );
  }

  return (
    <MuiField
      label={label}
      name={name}
      value={form[name]}
      onChange={handleChange}
      type={type}
      disabled={disabled}
      required={required}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  );
}

const muiFieldSx = {
  "& .MuiInputBase-input": { fontSize: 13 },
  "& .MuiInputLabel-root": { fontSize: 13 },
};

export function MuiField({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  fullWidth = true,
  size = "small",
  sx = {},
  onBlur,
  onKeyDown,
  slotProps,
}) {
  return (
    <TextField
      label={label}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      type={type}
      value={value ?? ""}
      onChange={e => onChange(name, e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      sx={{ ...muiFieldSx, ...sx }}
      slotProps={{
        inputLabel: type === "date" ? { shrink: true } : undefined,
        ...slotProps,
      }}
    />
  );
}

export function MuiSelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
  fullWidth = true,
  size = "small",
  sx = {},
}) {
  return (
    <FormControl fullWidth={fullWidth} size={size} required={required} disabled={disabled} sx={{ ...muiFieldSx, ...sx }}>
      <InputLabel sx={{ fontSize: 13 }}>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? ""}
        onChange={e => onChange(name, e.target.value)}
        sx={{ fontSize: 13 }}
      >
        {options.map(opt => (
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

export function DataTable({
  columns,
  rows,
  getKey,
  actions,
  editable = false,
  singleClick = false,
  onCellChange,
  onRowUpdate,
  onCellEditStop,
  checkboxSelection = false,
  disableMultipleRowSelection = false,
  onRowSelectionModelChange,
  autoHeight = false,
  isHeight,
  scroll,
  // Row-click behaviour: when true, clicking a row toggles its selection
  // (an already-selected row can be unchecked by clicking it again).
  toggleRowSelectionOnClick = false,
  // Per-row background colours by status (mimics StatusGrid's rowColors).
  statusKey = "status",
  rowColors = {},
}) {
  const apiRef = useGridApiRef();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const ROW_HEIGHT = 55;
  const HEADER_HEIGHT = 42;
  const maxRows = scroll?.afterRows ?? null;
  const useScrollHeight = maxRows != null && rows.length > maxRows;
  const resolvedAutoHeight = autoHeight && !useScrollHeight;
  const resolvedHeight = useScrollHeight
    ? maxRows * ROW_HEIGHT + HEADER_HEIGHT + 2
    : isHeight;

  const lastPage = Math.max(Math.ceil(rows.length / paginationModel.pageSize) - 1, 0);
  const effectivePaginationModel = {
    ...paginationModel,
    page: paginationModel.page > lastPage ? lastPage : paginationModel.page,
  };

  const muiColumns = [
    ...columns.map((col) => ({
      field: col.key,
      headerName: col.label,
      ...(scroll?.horizontal ? { width: col.minWidth ?? 120 } : { flex: 1, minWidth: col.minWidth ?? 100 }),
      sortable: true,
      editable: col.editable ?? editable,
      type: col.options ? "singleSelect" : col.type,
      valueOptions: col.options,
      headerAlign: "center",
      align: "center",

      renderCell: (params) => {
        const value = col.render ? col.render(params.row) : params.value;
        const displayValue = value ?? "";
        // Prefer the raw row string for the tooltip so custom render functions
        // that return elements (e.g. <span>) still show a meaningful tooltip.
        const textValue = typeof displayValue === "string"
          ? displayValue
          : (typeof params.value === "string" ? params.value : String(displayValue ?? ""));

        return (
          <Tooltip title={textValue || ""} placement="top" enterDelay={200} arrow>
            <span
              style={{
                display: "block",
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </span>
          </Tooltip>
        );
      },

      // Commit immediately when user picks from a dropdown — no blur required
      ...(col.options && (col.editable ?? editable)
        ? { renderEditCell: (params) => <InstantSelectEditCell {...params} /> }
        : {}),
      // Date columns use a native calendar picker
      ...(col.isDate && (col.editable ?? editable)
        ? { renderEditCell: (params) => <DateEditCell {...params} /> }
        : {}),
    })),

    ...(actions?.length
      ? [
        {
          field: "actions",
          headerName: "Actions",
          headerAlign: "center",
          align: "center",
          sortable: false,
          flex: 1,
          minWidth: 170,
          color: "primary",
          renderCell: (params) => (
            <Box style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              width: "100%",
            }}>
              {actions.map((action) => (
                <Tooltip key={action.label} title={action.label}>
                  <IconButton
                    size="small"
                    onClick={() => action.onClick(params.row)}
                    sx={{
                      color: action.label.toLowerCase() === "delete" ? "#dc2626" : "#7e22ce",
                      "&:hover": { background: action.label.toLowerCase() === "delete" ? "#fee2e2" : "#f3e8ff" },
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          ),
        },
      ]
      : []),
  ];

  const muiRows = rows.map((row, index) => ({
    id: getKey ? getKey(row, index) : index,
    ...row,
  }));

  // Apply a per-column / optional global background colour based on status.
  const hasRowColors = Object.keys(rowColors).length > 0;
  const colorClassName = (status) =>
    "dgt-row-" + String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const getRowClassName = (params) =>
    rowColors[params.status ?? params[statusKey]]
      ? colorClassName(params[statusKey] ?? params.status)
      : "";
  const rowColorCss = hasRowColors
    ? Object.entries(rowColors)
        .map(([status, color]) =>
          `.dgt-row-${String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-")} { background-color: ${color} !important; }`
        )
        .join("\n")
    : "";

  const tableSx = {
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #ffffff 0%, #fcfbff 100%)",
    boxShadow: "none",
    "& .MuiDataGrid-main": {
      background: "transparent",
    },
    ...(resolvedAutoHeight ? {} : { height: resolvedHeight ?? 320 }),
    width: "100%",
    "& .MuiDataGrid-columnHeaders": {
      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
      borderBottom: "none",
      color: "#fff",
      minHeight: "42px !important",
    },
    "& .MuiDataGrid-columnHeader": {
      borderRight: "1px solid rgba(255,255,255,0.18)",
    },
    "& .MuiDataGrid-columnHeader:last-of-type": {
      borderRight: "none",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 700,
      fontSize: "12px",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "#0f0b0b",
    },
    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
    "& .MuiDataGrid-cell": {
      borderBottom: "1px solid #f3e8ff",
      borderRight: "1px solid #f3e8ff",
      color: "#334155",
      padding: "6px 12px",
      fontSize: "13px",
      minHeight: "unset",
      lineHeight: 1.3,
      backgroundColor: "transparent",
    },
    "& .MuiDataGrid-cell:last-of-type": {
      borderRight: "none",
    },
    "& .MuiDataGrid-row": {
      transition: "all 0.2s ease",
      backgroundColor: "#ffffff",
      margin: 0,
      minHeight: "36px !important",
      "&:hover": {
        backgroundColor: "#f8f5ff !important",
      },
    },
    "& .MuiDataGrid-row:nth-of-type(even)": {
      backgroundColor: "#fcfbff",
    },
    "& .MuiDataGrid-footerContainer": {
      borderTop: "1px solid #f3e8ff",
      background: "#faf7ff",
      // minHeight: "12px",
    },
    "& .MuiTablePagination-root": {
      color: "#6d28d9",
    },
    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
      outline: "none",
    },
  };

  const totalMinWidth = columns.reduce((sum, col) => sum + (col.minWidth ?? 120), 0)
    + (actions?.length ? 170 : 0)
    + (checkboxSelection ? 50 : 0);

  return (
    <div
      className="dataTableWrapper"
      style={{
        width: "100%",
        marginBottom: 24,
        overflowX: scroll?.horizontal ? "auto" : "visible",
      }}
    >
      {hasRowColors && <style>{rowColorCss}</style>}
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        disableRowSelectionOnClick={!toggleRowSelectionOnClick}
        disableColumnMenu={false}
        density="compact"
        rowHeight={55}
        headerHeight={42}
        autoHeight={resolvedAutoHeight}
        hideFooter
        disableVirtualization={false}
        rowSelection={true}
        {...(hasRowColors ? { getRowClassName } : {})}
        {...(singleClick ? {
          apiRef,
          onCellClick: (params) => {
            if (params.colDef.editable) {
              apiRef.current.startCellEditMode({ id: params.id, field: params.field });
            }
          }
        } : {})}
        {...(checkboxSelection ? { checkboxSelection: true } : {})}
        {...(disableMultipleRowSelection ? { disableMultipleRowSelection: true } : {})}
        {...(onRowSelectionModelChange ? { onRowSelectionModelChange } : {})}
        {...(onCellEditStop || (editable && onCellChange) ? {
          onCellEditStop: (params, event) => {
            const { id, field, value } = params;
            // onCellEditStop fires BEFORE processRowUpdate, so the row in the
            // grid still holds the pre-edit value. If the value didn't change
            // (e.g. user pressed Enter/Tab without editing), processRowUpdate
            // won't fire onCellChange. Fire it here so the API fetch still
            // happens (e.g. re-fetching docket data). When the value DID
            // change, row?.[field] !== value, so we skip and let
            // processRowUpdate handle it — avoiding a double API call.
            if (editable && onCellChange) {
              const row = apiRef.current.getRow(id);
              if (row?.[field] === value) {
                onCellChange(id, field, value);
              }
            }
            if (onCellEditStop) onCellEditStop(params, event);
          }
        } : {})}
        processRowUpdate={async (newRow, oldRow) => {
          if (onRowUpdate) return await onRowUpdate(newRow, oldRow);

          if (!onCellChange) return newRow;

          let updatedRow = newRow;
          for (const col of columns) {
            // Only process columns that are editable (per-column or global).
            if (!(col.editable ?? editable)) continue;
            if (newRow[col.key] !== oldRow[col.key]) {
              // onCellChange may be async (e.g. fetching remote data to auto-fill
              // other cells in the row). Await it so the returned row contains the
              // fully-updated values, keeping the grid's internal row state in
              // sync and allowing the same cell to be re-edited again.
              const changedRow = await onCellChange(newRow.id, col.key, newRow[col.key]);
              if (changedRow) updatedRow = { ...updatedRow, ...changedRow };
            }
          }
          return updatedRow;
        }}
        onProcessRowUpdateError={(error) => {
          console.error("DataTable edit error:", error);
        }}

        sx={tableSx}
      />
      </div>
    // </div>
  );
}

