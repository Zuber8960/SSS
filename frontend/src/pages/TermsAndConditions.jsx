import pdfFile from "../pdf/T&C_of_Carriage.pdf";

export default function TermsAndConditions() {
  return (
    <embed
      src={pdfFile}
      type="application/pdf"
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
      }}
    />
  );
}
