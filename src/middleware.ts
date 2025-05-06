import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (Astro, next) => {
  const user = await Astro?.session?.get("user");
  const isLoginPage = ["/login", "/login-admin"].includes(Astro.url.pathname);
  const isDashboardRoute = Astro.url.pathname.startsWith("/dashboard");

  if (user) {
    Astro.locals.user = user;
  }

  if (user && isLoginPage) {
    return Astro.redirect("/dashboard/resources");
  }

  if (!user && isDashboardRoute) {
    return Astro.redirect("/");
  }

  return next();
};
