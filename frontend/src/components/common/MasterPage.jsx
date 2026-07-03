import "../../styles/MasterPage.css";

import { useState } from "react";
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
          {...(type === "number" ? {
            min: 0,
            onKeyDown: (e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault(),
          } : {})}
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
      minWidth: col.minWidth ?? 160,
      sortable: true,
      editable: col.editable ?? editable,
      type: col.options ? "singleSelect" : col.type,
      valueOptions: col.options,
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
    <div className="dataTableWrapper" style={{ width: "100%", marginBottom: 24 }}>
      <DataGrid
        rows={muiRows}
        columns={muiColumns}
        paginationModel={effectivePaginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5]}
        disableRowSelectionOnClick
        pagination
        autoHeight
        {...(singleClick ? { singleClickEdit: true } : {})}
        processRowUpdate={(newRow, oldRow) => {
          if (!editable || !onCellChange) return newRow;

          let updatedRow = newRow;

          columns.forEach((col) => {
            if (newRow[col.key] !== oldRow[col.key]) {
              const changedRow = onCellChange(newRow.id, col.key, newRow[col.key]);

              if (changedRow) {
                updatedRow = { ...updatedRow, ...changedRow };
              }
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

