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
import { Eye, MoreHorizontal, Phone, Mail } from "lucide-react"
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
import { AdmissionStatus } from "@/server/api/routers/admission"

export function LeadsList() {
  const { toast } = useToast()
  const utils = api.useUtils()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.admission.getLeads.useInfiniteQuery(
      {
        branchId: undefined, // This will be set by the context
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    )

  const addInteractionMutation = api.admission.createInteraction.useMutation({
    onSuccess: () => {
      toast({
        title: "Interaction added",
        description: "The lead interaction has been recorded successfully.",
      })
      utils.admission.getLeads.invalidate()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const leads = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Contact</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No leads found
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  {lead.firstName} {lead.lastName}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{lead.source?.name || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      lead.status === AdmissionStatus.NEW
                        ? "secondary"
                        : lead.status === AdmissionStatus.CONTACTED
                        ? "default"
                        : lead.status === AdmissionStatus.ENGAGED
                        ? "success"
                        : "destructive"
                    }
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.interactions?.[0]
                    ? format(
                        new Date(lead.interactions[0].date),
                        "MMM d, yyyy"
                      )
                    : "No contact yet"}
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
                          addInteractionMutation.mutate({
                            leadId: lead.id,
                            type: "CALL",
                            description: "Initial contact call",
                            date: new Date(),
                          })
                        }
                      >
                        Add Call Record
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          addInteractionMutation.mutate({
                            leadId: lead.id,
                            type: "EMAIL",
                            description: "Follow-up email sent",
                            date: new Date(),
                          })
                        }
                      >
                        Add Email Record
                      </DropdownMenuItem>
                      <DropdownMenuItem>Convert to Application</DropdownMenuItem>
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