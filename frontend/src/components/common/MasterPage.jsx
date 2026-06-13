import "../../styles/MasterPage.css";

import { useEffect, useState } from "react";
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
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  useEffect(() => {
    setPaginationModel((model) => {
      const lastPage = Math.max(Math.ceil(rows.length / model.pageSize) - 1, 0);

      return model.page > lastPage ? { ...model, page: lastPage } : model;
    });
  }, [rows.length]);

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
    <div style={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5]}
        disableSelectionOnClick
        pagination
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
