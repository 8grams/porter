import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url, redirect }) => {
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("No code found in callback.", { status: 400 });
  }

  const clientId = import.meta.env.GOOGLE_CLIENT_ID!;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = "http://localhost:4321/api/login/google/callback";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    console.error("Error getting access token:", tokenData);
    return new Response("Failed to get access token.", { status: 500 });
  }

  const userResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    },
  );

  const userData = await userResponse.json();

  console.log("User Data:", userData);

  return redirect("/");
};
