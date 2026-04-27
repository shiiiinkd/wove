import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { User } from "@supabase/supabase-js";
import {
  getAccessTokenFromHeader,
  getCurrentUserFromToken,
} from "./auth.js";

type AuthContext = {
  token: string;
  user: User;
};

export const requireAuth = async (c: Context): Promise<AuthContext> => {
  const token = await getAccessTokenFromHeader(c);
  if (!token) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const user = await getCurrentUserFromToken(token);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid token error" });
  }

  return { token, user };
};
