import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BranchList } from "@/components/settings/branch-list";
import { BranchOrder } from "@/components/settings/branch-order";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

const BranchesSettingsPage: PageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Branch Settings | ScholaRise</title>
        <meta name="description" content="Manage branches in ScholaRise ERP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/settings">
            <Button variant="ghost" className="flex items-center gap-1 p-0">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#00501B]">Branch Management</h1>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="list">Branch List</TabsTrigger>
            <TabsTrigger value="order">Display Order</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <BranchList />
          </TabsContent>

          <TabsContent value="order" className="mt-0">
            <BranchOrder />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

BranchesSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default BranchesSettingsPage;
