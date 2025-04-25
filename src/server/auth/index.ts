import { authOptions } from "./config";
import { getServerSession } from "next-auth/next";

// Use a more generic approach with unknown types and type assertion
export const auth = async (req?: unknown, res?: unknown) => {
  // @ts-expect-error - We're using a simplified approach for compatibility
  return await getServerSession(req, res, authOptions);
};

export { authOptions };
