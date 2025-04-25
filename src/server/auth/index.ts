import { authOptions } from "./config";
import { getServerSession } from "next-auth/next";

export const auth = async (req?: any, res?: any) => {
  return await getServerSession(req, res, authOptions);
};

export { authOptions };
