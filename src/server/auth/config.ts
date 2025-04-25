import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { db } from "@/server/db";
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
    role: string;
    branchId: string | null;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions = {
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

        // Find or create the user in our database
        const user = await db.user.findUnique({
          where: { email: data.user.email },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        const primaryRole = user.roles[0]?.role.name || "Student";

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: primaryRole,
          branchId: user.branchId,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Only allow invited users
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { email: user.email ?? undefined },
        });

        return !!existingUser;
      }
      return true;
    },
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role || "Student",
        branchId: user.branchId,
      },
    }),
  },
  secret: env.AUTH_SECRET,
};
