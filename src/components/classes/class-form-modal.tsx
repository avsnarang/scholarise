import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassForm } from "./class-form";

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData?: any;
  onSuccess: () => void;
  branchId: string;
  sessionId: string;
}

export function ClassFormModal({
  isOpen,
  onClose,
  classData,
  onSuccess,
  branchId,
  sessionId,
}: ClassFormModalProps) {
  const isEditMode = !!classData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] dark:bg-[#202020] dark:border-[#303030] border-t-4 border-t-[#00501B] dark:border-t-[#7aad8c] dark:ring-[#7aad8c]/10 ring-[#00501B]/10 focus-within:ring-[#00501B]/20 dark:focus-within:ring-[#7aad8c]/20"
        style={{
          "--focus-shadow": "0 0 0 2px #00501B20",
          "--dark-focus-shadow": "0 0 0 2px #7aad8c30",
        } as React.CSSProperties}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold dark:text-white">
            {isEditMode ? "Edit Class" : "Add New Class"}
          </DialogTitle>
        </DialogHeader>

        <ClassForm 
          classData={classData}
          onSuccess={onSuccess}
          branchId={branchId}
          sessionId={sessionId}
          onCancel={onClose}
          isEditMode={isEditMode}
        />
      </DialogContent>
    </Dialog>
  );
}
