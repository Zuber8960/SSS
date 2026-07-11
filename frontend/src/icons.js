export { default as MenuIcon } from "@mui/icons-material/Menu";
export { default as CloseIcon } from "@mui/icons-material/Close";

export function LogoutSvgIcon({ width = 16, height = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zm-5 12H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2z"/>
    </svg>
  );
}
