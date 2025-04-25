import { Button } from "@/components/ui/button";
import { ShareIcon } from "lucide-react";
import { ShareModal } from "./share-modal";
import { useState } from "react";

interface ShareButtonProps {
  resourceType: string;
  resourceId: string;
  resourceName: string;
}

export function ShareButton({ resourceType, resourceId, resourceName }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() => setIsOpen(true)}
      >
        <ShareIcon className="h-4 w-4" />
        <span>Share</span>
      </Button>

      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    </>
  );
}
