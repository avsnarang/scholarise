import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    DATABASE_URL: z.string().url(),
    WATI_API_TOKEN: z.string().optional(),
    WATI_BASE_URL: z.string().url().optional(),

    // Meta WhatsApp Business API Configuration - Required for WhatsApp messaging
    META_WHATSAPP_ACCESS_TOKEN: z.string().min(1, "META_WHATSAPP_ACCESS_TOKEN is required for WhatsApp messaging"),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, "META_WHATSAPP_PHONE_NUMBER_ID is required for WhatsApp messaging"),
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1, "META_WHATSAPP_BUSINESS_ACCOUNT_ID is required for Meta template management"),
    META_WHATSAPP_API_VERSION: z.string().optional(),
    META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1, "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN is required for webhook verification"),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    AUTH_DISCORD_ID: z.string().optional(),
    AUTH_DISCORD_SECRET: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),

  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WATI_API_TOKEN: process.env.WATI_API_TOKEN,
    WATI_BASE_URL: process.env.WATI_BASE_URL,
    
    // Meta WhatsApp API Configuration
    META_WHATSAPP_ACCESS_TOKEN: process.env.META_WHATSAPP_ACCESS_TOKEN,
    META_WHATSAPP_PHONE_NUMBER_ID: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
    META_WHATSAPP_API_VERSION: process.env.META_WHATSAPP_API_VERSION,
    META_WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN,

    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
