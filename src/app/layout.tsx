import { Montserrat, Lilita_One } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
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
  title: "ScholaRise",
  description: "ScholaRise ERP System",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${lilitaOne.variable} font-sans`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TRPCProvider>
              <PopupProvider>
                {/* <BackgroundServiceInitializer /> */}
                {children}
                <ImprovedToaster />
              </PopupProvider>
            </TRPCProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 