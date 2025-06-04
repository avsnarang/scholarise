import { Montserrat, Lilita_One } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/providers/theme-provider";
import { PopupProvider } from "@/components/ui/custom-popup";
import { ImprovedToaster } from "@/components/ui/improved-toaster";
import { TRPCProvider } from "@/providers/trpc-provider";
// import { BackgroundServiceInitializer } from "@/components/startup/background-service-initializer";
import "@/styles/globals.css";
// Body font
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

// Heading font
const lilitaOne = Lilita_One({
  weight: "400", // Lilita One only comes in 400 weight
  subsets: ["latin"],
  variable: "--font-lilita-one",
});

export const metadata = {
  title: "ScholaRise ERP",
  description: "ScholaRise ERP System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${lilitaOne.variable} font-sans`} suppressHydrationWarning>
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TRPCProvider>
              <PopupProvider>
                {/* <BackgroundServiceInitializer /> */}
                {children}
                <ImprovedToaster />
              </PopupProvider>
            </TRPCProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
} 