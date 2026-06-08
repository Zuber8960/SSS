import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";

export default function CommonAlertDialog({
  dialog,
  onClose,
}) {
  const handleConfirm = () => {
    if (dialog.onConfirm) {
      dialog.onConfirm();
    }
    onClose();
  };

  return (
    <Dialog
      open={dialog.open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {dialog.title}
      </DialogTitle>

      <DialogContent>
        <Alert severity={dialog.severity}>
          {dialog.message}
        </Alert>
      </DialogContent>

      <DialogActions>
        {dialog.showCancel && (
          <Button onClick={onClose}>
            {dialog.cancelText}
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleConfirm}
        >
          {dialog.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}