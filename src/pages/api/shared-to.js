import { openDB } from "../../utils/db";

export async function GET({ request }) {
  const db = await openDB();
  const url = new URL(request.url);
  const resourceId = url.searchParams.get("resourceId");
  const sharedTo = await db.all(
    `
    SELECT
    shares.*,
    eligible_users.email
  FROM
    shares
  JOIN
    eligible_users ON shares.share_to = eligible_users.id WHERE shares.resource_id = ?`,
    [resourceId],
  );
  return new Response(JSON.stringify({ success: true, sharedTo }));
}
