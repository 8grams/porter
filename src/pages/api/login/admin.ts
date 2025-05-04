import type { APIRoute } from "astro";
import { SignJWT } from "jose";
import { nanoid } from "nanoid";

export const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET_KEY);

export const POST: APIRoute = async (ctx) => {
  try {
    const payload = await ctx.request.formData();
    const email = payload.get("email");
    const password = payload.get("password");

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and Password are required!" }),
        {
          status: 400,
        },
      );
    }

    if (
      email !== import.meta.env.ADMIN_USERNAME ||
      password !== import.meta.env.ADMIN_PASSWORD
    ) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
      });
    }

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setJti(nanoid())
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    ctx.cookies.set("porter_authorization", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return new Response(
      JSON.stringify({
        message: "Successfully logged in",
      }),
      { status: 200 },
    );
  } catch (error) {
    console.debug(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
