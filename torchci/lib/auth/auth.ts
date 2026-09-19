import { getServerSession } from "next-auth";
import { authOptions } from "pages/api/auth/[...nextauth]";

const API_TOKEN_HEADER = "x-hud-internal-bot";

export async function checkAuthWithApiToken(req: any, res: any) {
  // A deployment with no GitHub OAuth app and no session cookie -- a self-hosted HUD behind its
  // own ingress -- has no way to satisfy either check below, so every benchmark API call 401s.
  // Opt-in and off by default, so hud.pytorch.org is unaffected. Set it only where access is
  // already controlled by the network in front of the app.
  if (process.env.ALLOW_UNAUTHENTICATED_API === "1") {
    return { ok: true, type: "unauthenticated" };
  }

  // Check Custom Header
  const headerToken = req.headers[API_TOKEN_HEADER];
  if (headerToken && headerToken == process.env.INTERNAL_API_TOKEN) {
    return { ok: true, type: "header" };
  }

  // if no headertoken provided, falls back to NextAuth Session.
  // @ts-ignore
  const session = await getServerSession(req, res, authOptions);
  if (session?.user && session?.accessToken) {
    return { ok: true, type: "session" };
  }

  // 3. Not authenticated
  return { ok: false };
}

export async function checkAuthWithLogin(req: any, res: any) {
  // NextAuth Session
  // @ts-ignore
  const session = await getServerSession(req, res, authOptions);
  if (session?.user && session?.accessToken) {
    return { ok: true, type: "session" };
  }
  // 3. Not authenticated
  return { ok: false };
}
