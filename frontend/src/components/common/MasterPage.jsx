import { useState, useEffect } from "react";
import { DataGrid, useGridApiContext } from "@mui/x-data-grid";
import { Box, Button, Select, MenuItem } from "@mui/material";

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
  const handleChange = (e) => {
    apiRef.current.setEditCellValue({ id, field, value: e.target.value });
    apiRef.current.stopCellEditMode({ id, field });
  };
  return (
    <Select
      value={value ?? ""}
      onChange={handleChange}
      size="small"
      fullWidth
      autoFocus
      open
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
        <button
          key={action.label}
          className={action.active ? "active" : ""}
          onClick={action.onClick}
        >
          {action.label}
        </button>
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
}) {
  const updateField = (value) => setForm({ ...form, [name]: value });

  return (
    <div className="formFieldGroup">
      <label>{label}</label>
      {options ? (
        <select
          value={form[name]}
          disabled={disabled}
          onChange={(e) => updateField(e.target.value)}
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
  checkboxSelection = false,
  onRowSelectionModelChange,
}) {
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

      renderCell: (params) =>
        col.render ? col.render(params.row) : params.value,

      // Commit immediately when user picks from a dropdown — no blur required
      ...(col.options && (col.editable ?? editable)
        ? { renderEditCell: (params) => <InstantSelectEditCell {...params} /> }
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
                <Button
                  key={action.label}
                  variant="contained"
                  sx={{
                    minWidth: "60px",
                    padding: "8px",
                    fontSize: "11px",
                    lineHeight: 1.2,
                    fontWeight: "bold"
                  }}
                  color={
                    action.label.toLowerCase() === "delete"
                      ? "error"
                      : "primary"
                  }
                  onClick={() =>
                    action.onClick(params.row)
                  }
                >
                  {action.label}
                </Button>
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

  return (
    <div className="dataTableWrapper" style={{ width: "100%", marginBottom: 24, overflowX: "auto" }}>
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        paginationModel={effectivePaginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5]}
        {...(!checkboxSelection ? { disableRowSelectionOnClick: true } : {})}
        pagination
        autoHeight
        {...(singleClick ? { singleClickEdit: true } : {})}
        {...(checkboxSelection ? { checkboxSelection: true } : {})}
        {...(onRowSelectionModelChange ? { onRowSelectionModelChange } : {})}
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

        sx={{
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#f5f5f5",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: "bold",
            fontSize: "14px",
          },
        }}


      />
    </div>
  );
}

