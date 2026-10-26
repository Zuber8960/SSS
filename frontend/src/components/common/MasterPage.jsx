import { useState, useEffect, useMemo, useRef } from "react";
import {
  DataGrid,
  useGridApiContext,
  useGridApiRef,
  getGridStringOperators,
  getGridNumericOperators,
  getGridSingleSelectOperators,
  gridFilteredSortedRowIdsSelector,
} from "@mui/x-data-grid";

const isTotalRow = (row) =>
  Boolean(row?.is_total || row?.id === "__total__" || row?.row_tone === "Total");

const keepTotalFilterOps = (operators) =>
  (operators || []).map((op) => ({
    ...op,
    getApplyFilterFn: (filterItem, column) => {
      const fn = op.getApplyFilterFn?.(filterItem, column);
      if (!fn) return fn;
      return (value, row, colDef, api) => isTotalRow(row) || fn(value, row, colDef, api);
    },
  }));
import { Box, Button, FormControl, InputLabel, Select, MenuItem, IconButton, TextField, Tooltip } from "@mui/material";
import { formatDateDisplay, formatDateIso } from "../../utils/tenantService";

function DateEditCell(props) {
  const { id, field, value } = props;
  const apiRef = useGridApiContext();
  // Normalise any display format to YYYY-MM-DD for input[type=date]
  const toInputFmt = (v) => formatDateIso(v);
  const handleChange = (e) => {
    const raw = e.target.value; // YYYY-MM-DD from input[type=date]
    if (!raw) return;
    const formatted = formatDateDisplay(raw);
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
      {colDef.valueOptions?.map((opt) => {
        const val = typeof opt === "object" ? opt.value : opt;
        const lbl = typeof opt === "object" ? opt.label : opt;
        return <MenuItem key={val} value={val}>{lbl}</MenuItem>;
      })}
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
              // Fallback for actions declared without an icon: render the label as
              // text so the button is never an invisible, clickable blank.
              ...(action.icon
                ? {}
                : {
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "none",
                    px: 1.5,
                    width: "auto",
                    minWidth: 0,
                    lineHeight: 1,
                  }),
            }}
          >
            {action.icon ?? action.label}
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
  const [editingDate, setEditingDate] = useState(false);
  const isDateField = type === "date";

  const fmtDisplay = (v) => (v ? formatDateDisplay(v) || v : "");

  // disabled or not actively editing → show formatted text
  const showPicker = isDateField && !disabled && editingDate;
  const displayType = showPicker ? "date" : (isDateField ? "text" : type);
  const displayValue = isDateField
    ? (showPicker ? formatDateIso(value) : fmtDisplay(value))
    : (value ?? "");

  const handleChange = (e) => {
    onChange(name, e.target.value);
    // after picking a date, return to formatted display
    if (showPicker) setEditingDate(false);
  };

  const handleBlur = (e) => {
    if (isDateField) setEditingDate(false);
    if (onBlur) onBlur(e);
  };

  return (
    <TextField
      label={label}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      type={displayType}
      value={displayValue}
      onChange={handleChange}
      onFocus={isDateField && !disabled ? () => setEditingDate(true) : undefined}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      sx={{ ...muiFieldSx, ...sx }}
      slotProps={{
        inputLabel: isDateField ? { shrink: true } : undefined,
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

// MUI's row-selection (checkbox) column field. Not re-exported by @mui/x-data-grid,
// but stable across v6+ (GRID_CHECKBOX_SELECTION_FIELD in the package source).
const SELECTION_COLUMN_FIELD = "__check__";

/*
 * MUI DataGrid v9 expects rowSelectionModel = { type: 'include'|'exclude', ids: Set<GridRowId> }.
 * Accept legacy inputs (array / Set) and normalise them into the v9 model shape so
 * callers can pass either form without hitting "currentSelection.ids is not iterable".
 */
function toRowSelectionModel(model) {
  if (model == null) return undefined;
  if (Array.isArray(model)) return { type: "include", ids: new Set(model) };
  if (model instanceof Set) return { type: "include", ids: model };
  return model; // already a v9 model object
}

export function DataTable({
  columns,
  rows,
  getKey,
  actions,
  actionsPosition = "right",
  editable = false,
  singleClick = false,
  onCellChange,
  onRowUpdate,
  onCellEditStop,
  checkboxSelection = false,
  disableMultipleRowSelection = false,
  isRowSelectable,
  onRowSelectionModelChange,
  rowSelectionModel,
  autoHeight = false,
  isHeight,
  scroll,
  dense = false,
  rowHeight: rowHeightProp,
  headerHeight: headerHeightProp,
  // Row-click behaviour: when true, clicking a row toggles its selection
  // (an already-selected row can be unchecked by clicking it again).
  toggleRowSelectionOnClick = false,
  // Per-row background colours by status (mimics StatusGrid's rowColors).
  statusKey = "status",
  rowColors = {},
  onFilteredRowsChange,
  footer,
  selectedRowColor,
}) {
  const apiRef = useGridApiRef();
  // Normalise the controlled selection prop to the v9 model shape. Memoised so the
  // object reference stays stable between renders — the grid compares the controlled
  // prop BY REFERENCE, and a fresh object each render would reset user selections.
  const controlledSelectionModel = useMemo(() => toRowSelectionModel(rowSelectionModel), [rowSelectionModel]);

  const [columnOrder, setColumnOrder] = useState(() => columns.map((c) => c.key));
  const dragColRef = useRef(null);
  const dragOverColRef = useRef(null);
  const wrapperRef = useRef(null);

  // Keep columnOrder in sync when columns prop changes (e.g. conditional columns)
  useEffect(() => {
    setColumnOrder((prev) => {
      const keys = columns.map((c) => c.key);
      const existing = prev.filter((k) => keys.includes(k));
      const added = keys.filter((k) => !prev.includes(k));
      return [...existing, ...added];
    });
  }, [columns]);

  // Attach drag-to-reorder to column header cells via DOM — avoids renderHeader
  // which can conflict with MUI's internal header text/styling.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onDragStart = (e) => {
      const header = e.target.closest('.MuiDataGrid-columnHeader[data-field]');
      if (!header) return;
      dragColRef.current = header.getAttribute('data-field');
    };
    const onDragOver = (e) => {
      const header = e.target.closest('.MuiDataGrid-columnHeader[data-field]');
      if (!header) return;
      e.preventDefault();
      dragOverColRef.current = header.getAttribute('data-field');
    };
    const onDrop = (e) => {
      const from = dragColRef.current;
      const to = dragOverColRef.current;
      dragColRef.current = null;
      dragOverColRef.current = null;
      if (!from || !to || from === to) return;
      setColumnOrder((prev) => {
        const next = [...prev];
        const fromIdx = next.indexOf(from);
        const toIdx = next.indexOf(to);
        if (fromIdx === -1 || toIdx === -1) return prev;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, from);
        return next;
      });
    };
    const onDragEnd = () => { dragColRef.current = null; dragOverColRef.current = null; };

    wrapper.addEventListener('dragstart', onDragStart);
    wrapper.addEventListener('dragover', onDragOver);
    wrapper.addEventListener('drop', onDrop);
    wrapper.addEventListener('dragend', onDragEnd);
    return () => {
      wrapper.removeEventListener('dragstart', onDragStart);
      wrapper.removeEventListener('dragover', onDragOver);
      wrapper.removeEventListener('drop', onDrop);
      wrapper.removeEventListener('dragend', onDragEnd);
    };
  }, []);

  // Mark header cells as draggable after each render (MUI re-renders them on column change)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const headers = wrapper.querySelectorAll('.MuiDataGrid-columnHeader[data-field]');
    headers.forEach((h) => {
      h.setAttribute('draggable', 'true');
      h.style.cursor = 'grab';
    });
  });

  const ROW_HEIGHT = rowHeightProp ?? (dense ? 40 : 55);
  const HEADER_HEIGHT = headerHeightProp ?? (dense ? 36 : 42);
  const maxRows = scroll?.afterRows ?? null;
  const useScrollHeight = maxRows != null && rows.length > maxRows;
  const resolvedAutoHeight = autoHeight && !useScrollHeight;
  const resolvedHeight = useScrollHeight
    ? maxRows * ROW_HEIGHT + HEADER_HEIGHT + 2
    : isHeight;
  // Community DataGrid always paginates. hideFooter does not turn that off, so
  // pageSize must cover every row or later invoices (5, 6, 7, …) never render.
  const paginationModel = {
    page: 0,
    pageSize: Math.max(rows.length, 1),
  };
  const disableVirtual = resolvedAutoHeight || rows.length <= 50;

  const orderedColumns = useMemo(() => {
    const colMap = Object.fromEntries(columns.map((c) => [c.key, c]));
    return columnOrder.map((key) => colMap[key]).filter(Boolean);
  }, [columns, columnOrder]);

  // Frozen (pinned) columns — common, opt-in per column:
  //   { key: "docket_no", label: "Docket", frozen: true }   // or frozen: "left" | "right"
  // A frozen column stays fixed while the table scrolls horizontally.
  // Like Excel's freeze panes, freezing a column also freezes everything to its left
  // (including the row-selection checkbox column), which keeps the grid's requirement
  // that pinned columns lead the visible column order.
  const frozenModel = useMemo(() => {
    const empty = { left: [], right: [] };
    // Pinning only matters when the table scrolls horizontally.
    if (!scroll?.horizontal) return empty;
    const isFrozenLeft = (c) => c.frozen === true || c.frozen === "left";
    const isFrozenRight = (c) => c.frozen === "right";
    const actionsOnLeft = Boolean(actions?.length) && (actionsPosition === "left" || actionsPosition === "start");
    if (!columns.some((c) => isFrozenLeft(c) || isFrozenRight(c)) && !actionsOnLeft) return empty;

    // Same visible order the grid sees: selection column first, optional
    // actions on the left, then the (draggable) column order, then actions
    // appended at the far right by default.
    const visibleOrder = [
      ...(checkboxSelection ? [SELECTION_COLUMN_FIELD] : []),
      ...(actionsOnLeft ? ["actions"] : []),
      ...columnOrder.filter((key) => columns.some((c) => c.key === key)),
      ...(actions?.length && !actionsOnLeft ? ["actions"] : []),
    ];
    let lastFrozenLeft = -1;
    let firstFrozenRight = -1;
    visibleOrder.forEach((key, index) => {
      if (key === "actions" && actionsOnLeft) lastFrozenLeft = Math.max(lastFrozenLeft, index);
      if (columns.some((c) => c.key === key && isFrozenLeft(c))) lastFrozenLeft = index;
      if (firstFrozenRight === -1 && columns.some((c) => c.key === key && isFrozenRight(c))) {
        firstFrozenRight = index;
      }
    });
    return {
      left: lastFrozenLeft === -1 ? [] : visibleOrder.slice(0, lastFrozenLeft + 1),
      right: firstFrozenRight === -1 ? [] : visibleOrder.slice(firstFrozenRight),
    };
  }, [columns, columnOrder, actions, actionsPosition, checkboxSelection, scroll]);

  // Push the frozen model into the grid state. `state.pinnedColumns` is what MUI's
  // column-pinning machinery reads (cells, headers, virtualization offsets), and the
  // community DataGrid never sets it on its own — so this is the single place that
  // turns the `frozen` column flag into actual pinned rendering.
  useEffect(() => {
    const current = apiRef.current.state?.pinnedColumns;
    if (!current) return;
    const same =
      JSON.stringify(current.left ?? []) === JSON.stringify(frozenModel.left) &&
      JSON.stringify(current.right ?? []) === JSON.stringify(frozenModel.right);
    if (same) return;
    apiRef.current.setState((state) => ({ ...state, pinnedColumns: frozenModel }));
  }, [apiRef, frozenModel]);

  const baseColumns = [
    ...orderedColumns.map((col) => ({
      field: col.key,
      headerName: col.label,
      ...(scroll?.horizontal
        ? { width: col.minWidth ?? 120 }
        : { flex: col.flex ?? 1, minWidth: col.minWidth ?? 100 }),
      sortable: true,
      sortComparator: (v1, v2, c1, c2) => {
        const r1 = c1.api.getRow(c1.id);
        const r2 = c2.api.getRow(c2.id);
        if (isTotalRow(r1)) return 1;
        if (isTotalRow(r2)) return -1;
        if (typeof col.sortComparator === "function") return col.sortComparator(v1, v2, c1, c2);
        const a = v1 == null ? "" : v1;
        const b = v2 == null ? "" : v2;
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      },
      filterOperators: keepTotalFilterOps(
        col.options || col.type === "singleSelect"
          ? getGridSingleSelectOperators()
          : col.type === "number"
            ? getGridNumericOperators()
            : getGridStringOperators()
      ),
      editable: col.editable ?? editable,
      type: col.options ? "singleSelect" : col.type,
      valueOptions: col.options,
      headerAlign: col.headerAlign || col.align || "center",
      align: col.align || "center",

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
  ];

  // The Actions column sits at the far right by default; when actionsPosition is
  // given it is spliced in at that index instead (clamped to the column range).
  const addActionsColumn = (cols) => {
    if (!actions?.length) return cols;
    const actionsColWidth = Math.max(48, 20 + actions.length * 36);
    const actionsColumn = {
      field: "actions",
      headerName: "Act.",
      headerAlign: "center",
      align: "center",
      sortable: false,
      width: actionsColWidth,
      minWidth: actionsColWidth,
      maxWidth: actionsColWidth,
      flex: 0,
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
    };

    const next = [...cols];
    if (actionsPosition === "left" || actionsPosition === "start") next.unshift(actionsColumn);
    else next.push(actionsColumn);
    return next;
  };

  const muiColumns = addActionsColumn(baseColumns);

  const muiRows = rows.map((row, index) => ({
    id: getKey ? getKey(row, index) : index,
    ...row,
  }));

  const emitFilteredRows = () => {
    if (!onFilteredRowsChange || !apiRef.current?.getRow) return;
    try {
      const ids = gridFilteredSortedRowIdsSelector(apiRef);
      const visible = ids
        .map((id) => apiRef.current.getRow(id))
        .filter((r) => r && !isTotalRow(r));
      onFilteredRowsChange(visible);
    } catch {
      /* grid not ready */
    }
  };

  // Apply a per-column / optional global background colour based on status.
  const hasRowColors = Object.keys(rowColors).length > 0;
  const colorClassName = (status) =>
    "dgt-row-" + String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const getRowClassName = (params) => {
    const row = params.row || {};
    const status = row[statusKey] ?? params[statusKey] ?? params.status;
    const tone = rowColors[status] ? colorClassName(status) : "";
    return `${tone}${isTotalRow(row) ? " dgt-row-total" : ""}`.trim();
  };
  const rowColorCss = hasRowColors
    ? Object.entries(rowColors)
        .map(([status, color]) => {
          const cls = `.dgt-row-${String(status).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return `${cls}, ${cls}:nth-of-type(even), ${cls}:hover { background-color: ${color} !important; }`;
        })
        .join("\n")
    : "";

  const tableSx = {
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #ffffff 0%, #fcfbff 100%)",
    boxShadow: "none",
    "--DataGrid-headerHeight": `${HEADER_HEIGHT}px`,
    "--DataGrid-headersTotalHeight": `${HEADER_HEIGHT}px`,
    "--DataGrid-topContainerHeight": `${HEADER_HEIGHT}px`,
    "& .MuiDataGrid-main": {
      background: "transparent",
    },
    ...(disableVirtual
      ? {
          "& .MuiDataGrid-container--top, & .MuiDataGrid-topContainer": {
            position: "sticky",
            top: 0,
            zIndex: 40,
            flex: `0 0 ${HEADER_HEIGHT}px`,
            height: HEADER_HEIGHT,
            minHeight: HEADER_HEIGHT,
          },
          "& .MuiDataGrid-virtualScrollerRenderZone": {
            position: "relative !important",
            top: "0 !important",
            transform: "none !important",
          },
        }
      : {}),
    ...(resolvedAutoHeight ? {} : { height: resolvedHeight ?? 320 }),
    width: scroll?.horizontal ? "max-content" : "100%",
    minWidth: scroll?.horizontal ? undefined : "100%",
    "& .MuiDataGrid-columnHeaders": {
      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
      borderBottom: "none",
      color: "#fff",
      minHeight: `${HEADER_HEIGHT}px !important`,
      maxHeight: `${HEADER_HEIGHT}px !important`,
    },
    "& .MuiDataGrid-columnHeader": {
      borderRight: "1px solid rgba(255,255,255,0.18)",
    },
    "& .MuiDataGrid-columnHeader:last-of-type": {
      borderRight: "none",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 700,
      fontSize: dense ? "11px" : "12px",
      letterSpacing: dense ? "0.02em" : "0.04em",
      textTransform: "uppercase",
      color: "#0f0b0b",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-columnSeparator": {
      display: "flex",
    },
    "& .MuiDataGrid-cell": {
      borderBottom: "1px solid #f3e8ff",
      borderRight: "1px solid #f3e8ff",
      color: "#334155",
      padding: dense ? "4px 8px" : "6px 12px",
      fontSize: dense ? "12px" : "13px",
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
      minHeight: `${ROW_HEIGHT}px !important`,
      maxHeight: `${ROW_HEIGHT}px !important`,
      "&:hover": {
        backgroundColor: "#f8f5ff !important",
      },
    },
    "& .MuiDataGrid-row:nth-of-type(even)": {
      backgroundColor: "#fcfbff",
    },
    ...(selectedRowColor
      ? {
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: `${selectedRowColor} !important`,
          },
          "& .MuiDataGrid-row.Mui-selected:nth-of-type(even)": {
            backgroundColor: `${selectedRowColor} !important`,
          },
          "& .MuiDataGrid-row.Mui-selected:hover": {
            backgroundColor: "#c8f0d4 !important",
          },
          "& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell": {
            backgroundColor: "transparent !important",
          },
        }
      : {}),
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
    "& .dgt-row-total, & .dgt-row-total .MuiDataGrid-cell, & .dgt-row-total .MuiDataGrid-cell span": {
      fontWeight: "700 !important",
    },
  };

  const totalMinWidth = columns.reduce((sum, col) => sum + (col.minWidth ?? 120), 0)
    + (actions?.length ? Math.max(48, 20 + actions.length * 36) : 0)
    + (checkboxSelection ? 50 : 0);

  return (
    <div
      ref={wrapperRef}
      className="dataTableWrapper"
      style={{
        width: "100%",
        marginBottom: dense ? 8 : 24,
        overflowX: scroll?.horizontal ? "auto" : "visible",
        overflowY: resolvedAutoHeight ? "visible" : "auto",
      }}
    >
      {hasRowColors && <style>{rowColorCss}</style>}
      <DataGrid
        apiRef={apiRef}
        rows={muiRows}
        columns={muiColumns}
        disableRowSelectionOnClick={!toggleRowSelectionOnClick}
        disableColumnMenu={false}
        density="compact"
        rowHeight={ROW_HEIGHT}
        columnHeaderHeight={HEADER_HEIGHT}
        autoHeight={resolvedAutoHeight}
        hideFooter
        pagination
        paginationModel={paginationModel}
        pageSizeOptions={[paginationModel.pageSize]}
        disableVirtualization={disableVirtual}
        rowSelection={true}
        getRowClassName={getRowClassName}
        onFilterModelChange={() => setTimeout(emitFilteredRows, 0)}
        onSortModelChange={() => setTimeout(emitFilteredRows, 0)}
        {...(singleClick ? {
          onCellClick: (params) => {
            if (params.colDef.editable) {
              apiRef.current.startCellEditMode({ id: params.id, field: params.field });
            }
          }
        } : {})}
        {...(checkboxSelection ? { checkboxSelection: true } : {})}
        {...(disableMultipleRowSelection ? { disableMultipleRowSelection: true } : {})}
        {...(isRowSelectable ? { isRowSelectable } : {})}
        {...(onRowSelectionModelChange ? { onRowSelectionModelChange } : {})}
        {...(rowSelectionModel !== undefined ? { rowSelectionModel: controlledSelectionModel } : {})}
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
      {footer}
      </div>
  );
}

