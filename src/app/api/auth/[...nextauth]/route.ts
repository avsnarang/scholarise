import NextAuth from "next-auth";
import { authOptions } from "@/server/auth/config";

// This is needed to prevent conflicts between NextAuth and Clerk
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 