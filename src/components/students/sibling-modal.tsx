import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/utils/api";
import { Loader2, Search, User, GraduationCap } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface SiblingModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  onSiblingAdded: () => void;
}

export function SiblingModal({ isOpen, onClose, studentId, onSiblingAdded }: SiblingModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [relationshipType, setRelationshipType] = useState("brother");
  const [searchError, setSearchError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedStudent(null);
      setSearchError("");
    }
  }, [isOpen]);

  // Fuzzy search query
  const { data: searchResults, isLoading: isSearching } = api.student.fuzzySearchStudents.useQuery(
    {
      searchTerm: debouncedSearchTerm,
      excludeStudentId: studentId,
      limit: 10
    },
    {
      enabled: debouncedSearchTerm.length > 0
    }
  );

  // Add sibling mutation
  const addSiblingMutation = api.student.addSibling.useMutation({
    onSuccess: () => {
      onSiblingAdded();
      onClose();
    },
    onError: (error) => {
      setSearchError(error.message);
    }
  });

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchTerm(`${student.admissionNumber} - ${student.firstName} ${student.lastName}`);
  };

  const handleAddSibling = () => {
    if (!selectedStudent) {
      setSearchError("Please select a student");
      return;
    }

    addSiblingMutation.mutate({
      studentId,
      siblingId: selectedStudent.id,
      relationshipType
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-[#252525] dark:border-[#303030]">
        <DialogHeader>
          <DialogTitle className="dark:text-[#e6e6e6]">Add Sibling</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="searchTerm" className="dark:text-[#e6e6e6]">
              Search by admission number or name
            </Label>
            <div className="relative">
              <Command className="rounded-lg border shadow-md dark:border-[#303030] dark:bg-[#252525]">
                <div className="flex items-center border-b px-3 dark:border-[#303030]">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 dark:text-[#c0c0c0]" />
                  <CommandInput
                    ref={inputRef}
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    placeholder="Type to search students..."
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#e6e6e6] dark:placeholder:text-[#808080]"
                  />
                </div>
                {searchTerm.length > 0 && (
                  <CommandList className="dark:bg-[#252525]">
                    {isSearching && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00501B] dark:text-[#7aad8c]" />
                      </div>
                    )}

                    {!isSearching && searchResults && searchResults.length === 0 && (
                      <CommandEmpty className="dark:text-[#c0c0c0]">No students found</CommandEmpty>
                    )}

                    {!isSearching && searchResults && searchResults.length > 0 && (
                      <CommandGroup heading="Matching Students" className="dark:text-[#c0c0c0]">
                        {searchResults.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={`${student.admissionNumber}-${student.firstName}-${student.lastName}`}
                            onSelect={() => handleSelectStudent(student)}
                            className="flex items-center gap-2 px-4 py-3 cursor-pointer dark:aria-selected:bg-[#303030] dark:text-[#e6e6e6] dark:hover:bg-[#303030]"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00501B]/10 text-sm font-bold uppercase text-[#00501B] dark:bg-[#7aad8c]/10 dark:text-[#7aad8c]">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div className="flex flex-col">
                              <div className="font-medium dark:text-[#e6e6e6]">{student.firstName} {student.lastName}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#c0c0c0]">
                                <span className="font-semibold">{student.admissionNumber}</span>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {student.class?.name || 'No Class'}
                                  {student.class?.section ? ` - ${student.class.section}` : ''}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                )}
              </Command>
            </div>
          </div>

          {searchError && (
            <div className="text-sm text-red-500 dark:text-red-400">
              {searchError}
            </div>
          )}

          {selectedStudent && (
            <div className="space-y-2">
              <Label htmlFor="relationshipType" className="dark:text-[#e6e6e6]">
                Relationship Type
              </Label>
              <Select
                value={relationshipType}
                onValueChange={setRelationshipType}
              >
                <SelectTrigger className="dark:border-[#303030] dark:bg-[#252525] dark:text-[#e6e6e6]">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent className="dark:border-[#303030] dark:bg-[#252525]">
                  <SelectItem value="brother" className="dark:text-[#e6e6e6] dark:focus:bg-[#303030] dark:data-[highlighted]:bg-[#303030]">Brother</SelectItem>
                  <SelectItem value="sister" className="dark:text-[#e6e6e6] dark:focus:bg-[#303030] dark:data-[highlighted]:bg-[#303030]">Sister</SelectItem>
                  <SelectItem value="twin" className="dark:text-[#e6e6e6] dark:focus:bg-[#303030] dark:data-[highlighted]:bg-[#303030]">Twin</SelectItem>
                  <SelectItem value="step-sibling" className="dark:text-[#e6e6e6] dark:focus:bg-[#303030] dark:data-[highlighted]:bg-[#303030]">Step Sibling</SelectItem>
                  <SelectItem value="other" className="dark:text-[#e6e6e6] dark:focus:bg-[#303030] dark:data-[highlighted]:bg-[#303030]">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="dark:bg-[#303030] dark:text-[#e6e6e6] dark:border-[#404040] dark:hover:bg-[#353535]">
            Cancel
          </Button>
          <Button
            onClick={handleAddSibling}
            disabled={!selectedStudent || addSiblingMutation.isPending}
            className="bg-[#00501B] hover:bg-[#00501B]/90 dark:bg-[#7aad8c] dark:hover:bg-[#7aad8c]/90"
          >
            {addSiblingMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add Sibling
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
