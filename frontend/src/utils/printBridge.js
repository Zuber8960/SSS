/**
 * Opens printable HTML in a browser, or sends it to the native print handler
 * when the app is running in a React Native WebView. Native code should handle
 * `PRINT_HTML` from `onMessage` and pass `html` to its print implementation.
 */
export function openPrintDocument({ html, title = "Document", features = "width=1000,height=1200", autoPrint = false }) {
  const nativeWebView = window.ReactNativeWebView;

  if (nativeWebView?.postMessage) {
    nativeWebView.postMessage(JSON.stringify({
      type: "PRINT_HTML",
      title,
      html,
      baseUrl: window.location.origin,
    }));
    return { handledByNative: true };
  }

  const printWindow = window.open("", "_blank", features);
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups for printing.");
  }

  printWindow.document.write(html);
  printWindow.document.close();

  if (autoPrint) {
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return { handledByNative: false, printWindow };
}