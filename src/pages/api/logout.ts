import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  ctx.cookies.set("porter_authorization", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
    },
  });
};
