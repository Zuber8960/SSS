import { useState } from "react";

export default function useAlert() {
  const [dialog, setDialog] = useState({
    open: false,
    title: "",
    message: "",
    severity: "info",
    showCancel: false,
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const closeAlert = () => {
    setDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const showAlert = ({
    title = "Notification",
    message = "",
    severity = "info",
    showCancel = false,
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm = null,
  }) => {
    setDialog({
      open: true,
      title,
      message,
      severity,
      showCancel,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

 
const showSuccess = (message, title = "Success") => {
  showAlert({
    title,
    message,
    severity: "success"
  });
};


  const showError = (message, title = "Error") => {
    showAlert({
      title,
      message,
      severity: "error",
    });
  };

  const showInfo = (message, title = "Information") => {
    showAlert({
      title,
      message,
      severity: "info",
    });
  };

  const showWarning = (
    title,
    message,
    onConfirm
  ) => {
    showAlert({
      title,
      message,
      severity: "warning",
      showCancel: true,
      confirmText: "Confirm",
      onConfirm,
    });
  };

  return {
    dialog,
    closeAlert,
    showAlert,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}