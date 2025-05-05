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
    return new Response(
      JSON.stringify({ error: "Email is required!", code: 400 }),
      {
        status: 400,
      },
    );
  }

  const db = await openDB();

  try {
    const existingUser = await db.get(
      "SELECT * FROM eligible_users WHERE email = ?",
      [email],
    );
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Email is already registered!", code: 400 }),
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
        code: 200,
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

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id || typeof id !== "number") {
      return new Response(
        JSON.stringify({ error: "Valid ID is required.", code: 400 }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const db = await openDB();
    const result = await db.run("DELETE FROM eligible_users WHERE id = ?", [
      id,
    ]);
    if (result.changes === 0) {
      return new Response(
        JSON.stringify({ error: "User not found.", code: 404 }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({ message: "User deleted successfully.", code: 200 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("DELETE /eligible-users error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error. Please try again later.",
        code: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const payload = await request.formData();
  const id = payload.get("_id");
  const email = payload.get("email");

  if (!id || typeof id !== "string") {
    return new Response(
      JSON.stringify({ error: "Valid ID is required.", code: 400 }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!email || typeof email !== "string") {
    return new Response(
      JSON.stringify({ error: "Email is required.", code: 400 }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const db = await openDB();

  try {
    const result = await db.run(
      "UPDATE eligible_users SET email = ? WHERE id = ?",
      [email, id],
    );
    if (result.changes === 0) {
      return new Response(
        JSON.stringify({ error: "User not found.", code: 404 }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({ message: "Successfully Update User.", code: 200 }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("PUT /eligible-users error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error. Please try again later.",
        code: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
