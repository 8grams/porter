import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async ({ request }, next) => {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    return Response.redirect(`${url.origin}/login`, 302);
  }
  return next();
};
