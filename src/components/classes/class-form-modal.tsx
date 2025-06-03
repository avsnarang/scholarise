"use client";

import { useState } from "react";
import { api } from "@/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateClassModal } from "./create-class-modal";
import { EditClassModal } from "./edit-class-modal";

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
  sessionId: string;
  editingClassId?: string;
}

export function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  branchId,
  sessionId,
  editingClassId,
}: ClassFormModalProps) {
  if (editingClassId) {
    return (
      <EditClassModal
        isOpen={isOpen}
        onClose={onClose}
        classId={editingClassId}
        branchId={branchId}
        sessionId={sessionId}
      />
    );
  }

  return (
    <CreateClassModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      branchId={branchId}
      sessionId={sessionId}
    />
  );
}
