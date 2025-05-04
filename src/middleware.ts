import { defineMiddleware } from "astro/middleware";
import { errors, jwtVerify } from "jose";
import { parse } from "cookie";

const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET_KEY);

const verifyAuth = async (token?: string) => {
  if (!token) {
    return {
      status: "unauthorized",
      message: "Please pass a request token",
    } as const;
  }

  try {
    const jwtVerifyResult = await jwtVerify(token, secret);
    return {
      status: "authorized",
      payload: jwtVerifyResult.payload,
      message: "successfully verified auth token",
    } as const;
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return {
        status: "error",
        message: error.message,
      } as const;
    }
    console.debug(error);
    return {
      status: "error",
      message: "could not validate auth token",
    } as const;
  }
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const cookie = context.request.headers.get("cookie") || "";
  const cookies = parse(cookie);
  const token = cookies["porter_authorization"];

  const protectedPaths = ["/dashboard"];
  const unauthenticatedOnlyPaths = ["/login", "/login/admin"];

  const verifyResult = await verifyAuth(token);

  if (pathname === "/") {
    if (verifyResult.status === "authorized") {
      return context.redirect("/dashboard/resources");
    } else {
      return context.redirect("/login");
    }
  }

  if (verifyResult.status === "authorized") {
    context.locals.user = verifyResult.payload as any;
    if (unauthenticatedOnlyPaths.some((path) => pathname === path)) {
      return context.redirect("/dashboard/resources");
    }
    return next();
  }

  if (verifyResult.status === "unauthorized") {
    context.locals.user = null;
    if (protectedPaths.some((path) => pathname.startsWith(path))) {
      return context.redirect("/login");
    }
    return next();
  }

  return next();
});
