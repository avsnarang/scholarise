"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/utils/api"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ApplicationStatus } from "@/server/api/routers/admission"

export function ApplicationsList() {
  const { toast } = useToast()
  const utils = api.useUtils()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.admission.getApplications.useInfiniteQuery(
      {
        branchId: undefined, // This will be set by the context
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    )

  const updateStatusMutation = api.admission.updateApplicationStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The application status has been updated successfully.",
      })
      utils.admission.getApplications.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const applications = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application #</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Current Stage</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No applications found
              </TableCell>
            </TableRow>
          ) : (
            applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-medium">
                  {application.applicationNumber}
                </TableCell>
                <TableCell>
                  {application.lead.firstName} {application.lead.lastName}
                </TableCell>
                <TableCell>
                  {format(new Date(application.applicationDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      application.status === ApplicationStatus.SUBMITTED
                        ? "secondary"
                        : application.status === ApplicationStatus.ACCEPTED
                        ? "success"
                        : application.status === ApplicationStatus.REJECTED
                        ? "destructive"
                        : "default"
                    }
                  >
                    {application.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {application.stages?.find((stage: any) => stage.status === "IN_PROGRESS")?.name || "—"}
                </TableCell>
                <TableCell>
                  {application.assignedTo?.name || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: application.id,
                            status: ApplicationStatus.ACCEPTED,
                          })
                        }
                      >
                        Approve Application
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: application.id,
                            status: ApplicationStatus.REJECTED,
                          })
                        }
                      >
                        Reject Application
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {hasNextPage && (
        <div className="flex justify-center p-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
} 