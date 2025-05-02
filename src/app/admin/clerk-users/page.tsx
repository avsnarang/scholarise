"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function ClerkUsersPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchClerkUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/clerk-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch Clerk users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!search.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clerk-users?search=${encodeURIComponent(search)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search Clerk users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "ID copied to clipboard",
    });
  };

  return (
    <PageWrapper title="Clerk Users">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clerk User Directory</CardTitle>
            <CardDescription>
              Find Clerk user IDs for linking teacher accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email or name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={searchUsers} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
                <Button variant="outline" onClick={fetchClerkUsers} disabled={loading}>
                  View All
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.emailAddresses[0]?.emailAddress}</p>
                          <p className="text-xs mt-1">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                              {user.id}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(user.id)}
                          title="Copy ID"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? "No users found matching your search" : "Click 'View All' to see users"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How To Fix Teacher Accounts</CardTitle>
            <CardDescription>
              Step-by-step guide to linking teacher accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Search for the teacher's email address above to find their Clerk user ID</li>
              <li>Copy the ID by clicking the copy button</li>
              <li>Go to the <a href="/admin/fix-teacher-account" className="text-blue-500 hover:underline">Fix Teacher Account</a> page</li>
              <li>Select the teacher from the list</li>
              <li>Paste the Clerk user ID in the appropriate field</li>
              <li>Click "Link Account" to save the changes</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
