import React from "react";

export { default as MenuIcon } from "@mui/icons-material/Menu";
export { default as CloseIcon } from "@mui/icons-material/Close";
export { default as EditIcon } from "@mui/icons-material/Edit";
export { default as SaveIcon } from "@mui/icons-material/Save";
export { default as AddIcon } from "@mui/icons-material/Add";
export { default as DeleteIcon } from "@mui/icons-material/Delete";
export { default as NoteAddIcon } from "@mui/icons-material/NoteAdd";
export { default as ClearIcon } from "@mui/icons-material/Clear";
export { default as ResetIcon } from "@mui/icons-material/RestartAlt";

export function LogoutSvgIcon({ width = 16, height = 16 }) {
  return React.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width, height, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement("path", { d: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zm-5 12H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2z" })
  );
}

export const SECTION_ICONS = {
  docketInfo:  "📋",
  consignor:   "🏢",
  consignee:   "🏬",
  package:     "📦",
  poInvoice:   "📄",
  insurance:   "🛡️",
  goods:       "🏷️",
  rateCharges: "💰",
  remarks:     "💬",
};
