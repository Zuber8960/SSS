import "../../styles/MasterPage.css";

import { DataGrid } from "@mui/x-data-grid";
import { Box, Button } from "@mui/material";

export function PageBody({ title, children }) {
  return (
    <div className="pageBody">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function PageToolbar({ actions }) {
  return (
    <div className="pageToolbar">
      {actions.map((action) => (
        <button
          key={action.label}
          className={action.active ? "active" : ""}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
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

export function FormPanel({ children, columns = "150px 300px 150px 300px" }) {
  return (
    <div className="formPanel">
      <div className="formGrid">
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
          type={type}
          value={form[name]}
          disabled={disabled}
          onChange={(e) => updateField(e.target.value)}
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
  onCellChange,
}) {

  // ✅ Convert your columns → MUI format
  const muiColumns = [
    ...columns.map((col) => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      sortable: true,
      editable,
      headerAlign: "center",
      align: "center",

      renderCell: (params) =>
        col.render ? col.render(params.row) : params.value,
    })),

    // ✅ Actions column
    ...(actions?.length
      ? [
          {
            field: "actions",
            headerName: "Actions",
            headerAlign: "center",
            align: "center",
            sortable: false,
            flex: 1,
            color: "primary",
            renderCell: (params) => (
              <Box style={{
                display: "flex",
                gap: 5,
                justifyContent: "center",   // ✅ horizontal center
                alignItems: "center",        // ✅ vertical center
                height: "100%",              // ✅ fill full row height
                width: "100%",
               }}>
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="contained"
                    // size="small"
                    
                  sx={{
                      minWidth: "60px",     // ✅ reduce width
                      padding: "8px",   // ✅ reduce height
                      fontSize: "11px",     // ✅ smaller text
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

  // ✅ Add id (required for DataGrid)
  const muiRows = rows.map((row, index) => ({
    id: getKey ? getKey(row, index) : index,
    ...row,
  }));

  return (
    <div style={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
        autoHeight
        processRowUpdate={(newRow, oldRow) => {
          if (!editable || !onCellChange) return newRow;

          columns.forEach((col) => {
            if (newRow[col.key] !== oldRow[col.key]) {
              onCellChange(newRow.id, col.key, newRow[col.key]);
            }
          });

          return newRow;
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
