import type { APIRoute } from "astro";
import { openDB } from "../../../../utils/db.ts";

export const GET: APIRoute = async () => {
  const db = await openDB();
  const users = await db.all("SELECT * FROM eligible_users");
  return new Response(JSON.stringify(users), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const POST: APIRoute = async (ctx) => {
  const payload = await ctx.request.formData();
  const email = payload.get("email");

  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Email is required!" }), {
      status: 400,
    });
  }

  const db = await openDB();

  try {
    const existingUser = await db.get(
      "SELECT * FROM eligible_users WHERE email = ?",
      [email],
    );
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Email is already registered!" }),
        { status: 400 },
      );
    }
    const result = await db.run(
      "INSERT INTO eligible_users (email) VALUES (?)",
      [email],
    );
    return new Response(
      JSON.stringify({
        message: "User added successfully!",
        userId: result.lastID,
        success: true,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to add user, please try again later." }),
      { status: 500 },
    );
  }
};
