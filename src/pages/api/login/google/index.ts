import type { APIRoute } from "astro";
import { env } from "./../../../../utils/env.js";

export const GET: APIRoute = async () => {
  const clientId = env.GOOGLE_CLIENT_ID;
  const redirectUri = "http://localhost:4321/api/login/google/callback";
  const scope = "openid email profile";
  const state = crypto.randomUUID();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
    },
  });
};
