import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (Astro, next) => {
  const user = await Astro?.session?.get("user");
  const isLoginPage = ["/login", "/login-admin"].includes(Astro.url.pathname);
  const isDashboardRoute = Astro.url.pathname.startsWith("/dashboard");
  const isAdminPage = [
    "/dashboard/settings/eligible-users",
    "/dashboard/settings/eligible-users/modal-eligible-users",
    "/dashboard/settings/eligible-users/delete-eligible-users",
  ].includes(Astro.url.pathname);
  if (user) {
    Astro.locals.user = user;
  }

  if (user && isLoginPage) {
    return Astro.redirect("/dashboard/resources");
  }

  if (user && isAdminPage && user.role !== "ADMIN") {
    return Astro.redirect("/dashboard/resources");
  }

  if (!user && isDashboardRoute) {
    return Astro.redirect("/");
  }

  return next();
};
