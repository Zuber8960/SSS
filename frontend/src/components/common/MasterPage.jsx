import { useState, useEffect } from "react";
import { DataGrid, useGridApiContext, useGridApiRef } from "@mui/x-data-grid";
import { Box, Button, Select, MenuItem, IconButton, Tooltip } from "@mui/material";
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
  const updateField = (value) => setForm({ ...form, [name]: value });

  return (
    <div className="formFieldGroup">
      <label>
        {label}
        {required && <span style={{ color: "#e53935", marginLeft: 2 }}>*</span>}
      </label>
      {options ? (
        <select
          value={form[name]}
          disabled={disabled}
          onChange={(e) => updateField(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>
              {option.label ?? option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type === "number" ? "text" : type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={form[name]}
          disabled={disabled}
          onChange={(e) => {
            if (type === "number") {
              const cleaned = e.target.value.replace(/[^0-9]/g, "");
              updateField(cleaned);
            } else {
              updateField(e.target.value);
            }
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={`Enter ${label}`}
        />
      )}
    </div>
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
  onRowSelectionModelChange,
  autoHeight = false,
}) {
  const apiRef = useGridApiRef();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const lastPage = Math.max(Math.ceil(rows.length / paginationModel.pageSize) - 1, 0);
  const effectivePaginationModel = {
    ...paginationModel,
    page: paginationModel.page > lastPage ? lastPage : paginationModel.page,
  };

  const muiColumns = [
    ...columns.map((col) => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: col.minWidth ?? 100,
      sortable: true,
      editable: col.editable ?? editable,
      type: col.options ? "singleSelect" : col.type,
      valueOptions: col.options,
      headerAlign: "center",
      align: "center",

      renderCell: (params) => {
        const value = col.render ? col.render(params.row) : params.value;
        const displayValue = value ?? "";
        const textValue = typeof displayValue === "string" ? displayValue : String(displayValue ?? "");

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

  const tableSx = {
    border: "none",
    borderRadius: "16px",
    overflow: "hidden",
    background: "linear-gradient(180deg, #ffffff 0%, #fcfbff 100%)",
    boxShadow: "none",
    "& .MuiDataGrid-main": {
      background: "transparent",
    },
    ...(autoHeight ? {} : { height: 320 }),
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

  return (
    <div className="dataTableWrapper" style={{ width: "100%", marginBottom: 24, overflowX: "auto" }}>
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        disableRowSelectionOnClick={true}
        disableColumnMenu={false}
        density="compact"
        rowHeight={55}
        headerHeight={42}
        autoHeight={autoHeight}
        hideFooter
        disableVirtualization={false}
        rowSelection={true}
        {...(singleClick ? {
          apiRef,
          onCellClick: (params) => {
            if (params.colDef.editable) {
              apiRef.current.startCellEditMode({ id: params.id, field: params.field });
            }
          }
        } : {})}
        {...(checkboxSelection ? { checkboxSelection: true } : {})}
        {...(onRowSelectionModelChange ? { onRowSelectionModelChange } : {})}
        {...(onCellEditStop ? { onCellEditStop } : {})}
        processRowUpdate={async (newRow, oldRow) => {
          if (!editable) return newRow;

          if (onRowUpdate) return await onRowUpdate(newRow, oldRow);

          if (!onCellChange) return newRow;

          let updatedRow = newRow;
          columns.forEach((col) => {
            if (newRow[col.key] !== oldRow[col.key]) {
              const changedRow = onCellChange(newRow.id, col.key, newRow[col.key]);
              if (changedRow) updatedRow = { ...updatedRow, ...changedRow };
            }
          });
          return updatedRow;
        }}
        onProcessRowUpdateError={(error) => {
          console.error("DataTable edit error:", error);
        }}

        sx={tableSx}
      />
    </div>
  );
}

