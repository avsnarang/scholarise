import { type NextPage } from "next";
import { Montserrat, Lilita_One } from "next/font/google";
import Head from "next/head";
import { api } from "@/utils/api";
import { ImprovedToaster } from "@/components/ui/improved-toaster";
import { PopupProvider } from "@/components/ui/custom-popup";
import { ThemeProvider } from "@/providers/theme-provider";

import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

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

// Define types for pages with layouts
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

type AppPropsWithLayout = {
  Component: NextPageWithLayout;
  pageProps: Record<string, unknown>;
};

const MyApp = ({
  Component,
  pageProps,
}: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <ClerkProvider {...pageProps}>
      <ThemeProvider>
      <PopupProvider>
        <Head>
          <title>ScholaRise ERP</title>
          <meta name="description" content="ScholaRise ERP System" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className={`${montserrat.variable} ${lilitaOne.variable} font-sans`}>
          {/* UserButton is now in the header component */}
          {getLayout(<Component {...pageProps} />)}
          <ImprovedToaster />
        </div>
      </PopupProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
