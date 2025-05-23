import { type DefaultSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { env } from "@/env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      branchId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    branchId: string | null;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = createServerSupabaseClient();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          return null;
        }

        // Note: User model has been removed from the schema
        // Using direct user data from Supabase as a fallback
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0],
          image: null,
          role: "User", // Default role since we can't get from DB
          branchId: null,
        };
      },
    }),
  ],
  // Note: PrismaAdapter requires the User model which no longer exists
  // Removed the adapter as it's incompatible with current schema
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn(_params: { user: unknown; account: unknown }) {
      // Since the User model no longer exists, allow all signins
      // You may want to implement a different auth strategy
      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id || token?.sub || "";
        session.user.role = (user?.role) || "User";
        session.user.branchId = (user?.branchId) || null;
      }
      return session;
    },
  },
  secret: env.AUTH_SECRET,
};
