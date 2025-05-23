export const metadata = {
  title: 'Sidebar Demo',
  description: 'Demo of the new sidebar component',
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-background">
      {children}
    </div>
  );
}
