import { usePopup } from "@/components/ui/custom-popup";

// This file provides utility functions to replace browser alerts and confirms
// with our custom popup component

// Replace window.alert with our custom popup
export function useCustomAlert() {
  const { alert } = usePopup();

  return (message: string, callback?: () => void) => {
    alert("Alert", message, callback);
  };
}

// Replace window.confirm with our custom popup
export function useCustomConfirm() {
  const { confirm } = usePopup();

  return (message: string, onConfirm?: () => void, onCancel?: () => void) => {
    confirm("Confirm", message, onConfirm, onCancel);
  };
}

// Specialized confirm for delete operations
export function useDeleteConfirm() {
  const { confirm } = usePopup();

  return (entityName: string, onConfirm?: () => void, onCancel?: () => void) => {
    confirm(
      "Delete Confirmation",
      `Are you sure you want to delete this ${entityName}? This action cannot be undone.`,
      onConfirm,
      onCancel
    );
  };
}

// Specialized confirm for bulk delete operations
export function useBulkDeleteConfirm() {
  const { confirm } = usePopup();

  return (entityName: string, count: number, onConfirm?: () => void, onCancel?: () => void) => {
    confirm(
      "Delete Confirmation",
      `Are you sure you want to delete ${count} ${entityName}${count > 1 ? 's' : ''}? This action cannot be undone.`,
      onConfirm,
      onCancel
    );
  };
}

// Specialized confirm for status change operations
export function useStatusChangeConfirm() {
  const { confirm } = usePopup();

  return (entityName: string, newStatus: boolean, count = 1, onConfirm?: () => void, onCancel?: () => void) => {
    const action = newStatus ? "activate" : "deactivate";

    confirm(
      "Status Change Confirmation",
      `Are you sure you want to ${action} ${count} ${entityName}${count > 1 ? 's' : ''}?`,
      onConfirm,
      onCancel
    );
  };
}
