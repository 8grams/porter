import { openDB } from "./db";
import {
  deletePostgresqlUser,
  deleteMysqlUser,
  deleteGcpUser,
  deleteAwsUser,
  deleteK8sUser,
  deleteSshUser,
  createUser,
} from "./share";
import { sendMail } from "./mailer.js";
import { env } from "./env.js";

await processExpiredShares();
await processRotationSchedule();

/**
 * Main function to check and delete expired resource shares
 */
export async function processExpiredShares() {
  const db = await openDB();
  const now = new Date().toISOString();
  const currentDate = now.split("T")[0]; // Get current date in YYYY-MM-DD format

  try {
    // Get all expired shares
    const expiredShares = await db.all(
      `SELECT s.*, r.type, r.host, r.username, r.password, r.value, e.email
       FROM shares s
       JOIN resources r ON s.resource_id = r.id
        JOIN eligible_users e ON s.share_to = e.id
       WHERE s.expired_at <= ?`,
      [currentDate],
    );

    const html = `
      Hello,<br><br>
      The access you received to the resource below has expired:<br><br>
      <strong>Resource Type:</strong> ${resource.type} <br>
      <strong>Host:</strong> ${resource.host || "-"} <br>
      <strong>Username:</strong> ${share.username} <br>
      <strong>Expired At:</strong> ${share.expired_at} <br>
      <strong>Rotation Period:</strong> ${share.rotation_period} <br><br>
      If you need renewed access, please request it again.<br><br>
      Regards,<br>Your Team
    `;

    console.log(`Found ${expiredShares.length} expired shares to process`);

    // Process each expired share
    for (const share of expiredShares) {
      try {
        const resource = await db.get(`SELECT * FROM resources WHERE id = ?`, [
          share.resource_id,
        ]);
        await revokeAccess(resource, share);
        await sendMail(
          env.ADMIN_USERNAME,
          share.email,
          "Your Access Has Expired",
          html,
        );
        console.log(`Successfully processed expired share ID: ${share.id}`);
      } catch (error) {
        console.error(`Error processing expired share ID: ${share.id}`, error);
      }
    }

    return {
      processed: expiredShares.length,
      success: true,
      timestamp: now,
    };
  } catch (error) {
    console.error("Error in processExpiredShares:", error);
    return {
      processed: 0,
      success: false,
      error: error.message,
      timestamp: now,
    };
  }
}

/**
 * Process shares that need rotation
 */
export async function processRotationSchedule() {
  const db = await openDB();
  const now = new Date().toISOString();
  const currentDate = now.split("T")[0];

  try {
    // Get all shares that need rotation
    const sharesToRotate = await db.all(
      `SELECT s.*, r.type, r.host, r.username, r.password, r.value, e.email
       FROM shares s
       JOIN resources r ON s.resource_id = r.id
       JOIN eligible_users e ON s.share_to = e.id
       WHERE s.next_rotation <= ?`,
      [currentDate],
    );

    console.log(`Found ${sharesToRotate.length} shares to rotate`);

    const html = `
          Hello,<br><br>
          Your access to the shared resource has been rotated. Here are your new credentials:<br><br>
          <strong>Resource Type:</strong> ${resource.type} <br>
          <strong>Host:</strong> ${resource.host || "-"} <br>
          <strong>Username:</strong> ${username} <br>
          <strong>Password:</strong> ${password} <br>
          <strong>Next Rotation:</strong> ${nextRotation} <br><br>
          Please keep these credentials secure.<br><br>
          Regards,<br>Your Team
        `;

    // Process each share that needs rotation
    for (const share of sharesToRotate) {
      try {
        // Revoke old access
        await revokeAccess(share);

        // Create new access with the same permissions
        const resource = await db.get(`SELECT * FROM resources WHERE id = ?`, [
          share.resource_id,
        ]);
        const { username, password } = await createUser(resource, share.role);

        // Calculate next rotation date
        const nextRotation = calculateNextRotation(
          share.rotation_period,
          currentDate,
        );

        // Update share with new credentials and rotation date
        await db.run(
          `UPDATE shares SET 
           username = ?, 
           password = ?, 
           next_rotation = ?
           WHERE id = ?`,
          [username, password, nextRotation, share.id],
        );

        // send email notification
        await sendMail(
          env.ADMIN_USERNAME,
          share.email,
          "Your Shared Resource Has Been Rotated",
          html,
        );

        console.log(`Successfully rotated share ID: ${share.id}`);
      } catch (error) {
        console.error(`Error rotating share ID: ${share.id}`, error);

        // Mark share as failed to rotate
        await db.run(`UPDATE shares SET rotation_status = ? WHERE id = ?`, [
          "failed",
          share.id,
        ]);
      }
    }

    return {
      rotated: sharesToRotate.length,
      success: true,
      timestamp: now,
    };
  } catch (error) {
    console.error("Error in processRotationSchedule:", error);
    return {
      rotated: 0,
      success: false,
      error: error.message,
      timestamp: now,
    };
  }
}

/**
 * Revoke access for an expired or rotated share
 */
async function revokeAccess(resource, share) {
  // Call the appropriate delete function based on resource type
  switch (resource.type) {
    case "postgresql_access":
      return await deletePostgresqlUser(resource, share.username);
    case "mysql_access":
      return await deleteMysqlUser(resource, share.username);
    case "google_iam":
      return await deleteGcpUser(resource, share.username);
    case "aws_iam":
      return await deleteAwsUser(resource, share.username);
    case "kubernetes":
      return await deleteK8sUser(resource, share.username);
    case "vm":
      return await deleteSshUser(resource, share.username);
    default:
      throw new Error(`Unsupported resource type: ${resource.type}`);
  }
}

/**
 * Calculate the next rotation date based on rotation period
 */
function calculateNextRotation(rotationPeriod, currentDate) {
  const date = new Date(currentDate);

  switch (rotationPeriod) {
    case "1_week":
      date.setDate(date.getDate() + 7);
      break;
    case "2_week":
      date.setDate(date.getDate() + 14);
      break;
    case "1_month":
      date.setMonth(date.getMonth() + 1);
      break;
    case "3_month":
      date.setMonth(date.getMonth() + 3);
      break;
    case "6_month":
      date.setMonth(date.getMonth() + 6);
      break;
    case "1_year":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to 1 month
  }

  return date.toISOString().split("T")[0]; // Return in YYYY-MM-DD format
}
