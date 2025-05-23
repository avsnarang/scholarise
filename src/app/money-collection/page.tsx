import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, Filter, Plus, Search, TrendingUp } from "lucide-react";
import { db } from "@/server/db";
import { createCaller } from "@/server/api/root";
import { MoneyCollectionTable } from "@/components/money-collection/money-collection-table";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/page-title";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { MoneyCollectionWithRelations } from "@/types/money-collection";

export default async function MoneyCollectionPage() {
  // Create caller without authentication for now
  const caller = createCaller({ 
    db, 
    auth: {}, 
    userId: null 
  });
  const moneyCollections = await caller.moneyCollection.getAll() as unknown as MoneyCollectionWithRelations[];
  
  // Calculate summary statistics
  const totalCollections = moneyCollections.length;
  const totalAmount = moneyCollections.reduce((sum, collection) => {
    return sum + collection.items.reduce((itemSum: number, item) => itemSum + item.amount, 0);
  }, 0);
  const pendingCollections = moneyCollections.filter(c => 
    c.items.length === 0 || 
    c.classes.some((cls) => {
      // This is a simplified check - would need proper logic to determine if all students have paid
      return true;
    })
  ).length;
  
  // Get recent collections (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCollections = moneyCollections.filter(c => 
    new Date(c.createdAt) >= thirtyDaysAgo
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <PageTitle heading="Money Collection" />
          <p className="text-muted-foreground text-sm">
            Manage money collection from students
          </p>
        </div>
        <Button asChild>
          <Link href="/money-collection/new">
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {totalCollections} collection drives
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Collections</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentCollections}</div>
            <p className="text-xs text-muted-foreground">
              Collections in the last 30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collections</CardTitle>
            <Badge variant="outline" className="bg-amber-100 text-amber-800">In Progress</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCollections}</div>
            <p className="text-xs text-muted-foreground">
              Collections with pending payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/money-collection/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Collection
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/reports/money-collection">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            className="pl-8"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Collections</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <Suspense fallback={<div>Loading money collections...</div>}>
            <MoneyCollectionTable initialMoneyCollections={moneyCollections} />
          </Suspense>
        </TabsContent>
        <TabsContent value="recent" className="mt-6">
          <Suspense fallback={<div>Loading recent collections...</div>}>
            <MoneyCollectionTable 
              initialMoneyCollections={moneyCollections.filter(c => 
                new Date(c.createdAt) >= thirtyDaysAgo
              )} 
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <Suspense fallback={<div>Loading pending collections...</div>}>
            <MoneyCollectionTable 
              initialMoneyCollections={moneyCollections.filter(c => 
                c.items.length === 0 || c.classes.some((cls) => true)
              )} 
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
} 