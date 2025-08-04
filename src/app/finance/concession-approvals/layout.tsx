import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concession Approvals | Finance",
  description: "Review and approve student concession requests",
};

export default function ConcessionApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}