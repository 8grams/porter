import { openDB } from './db';
import { 
  deletePostgresqlUser, 
  deleteMysqlUser, 
  deleteGcpUser, 
  deleteAwsUser, 
  deleteK8sUser,
  deleteSshUser
} from './share';

/**
 * Main function to check and delete expired resource shares
 */
export async function processExpiredShares() {
  const db = await openDB();
  const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
  
  try {
    // Get all expired shares
    const expiredShares = await db.all(
      `SELECT s.*, r.type, r.host, r.username, r.password, r.value
       FROM shares s
       JOIN resources r ON s.resource_id = r.id
       WHERE s.expired_at <= ?`,
      [currentDate]
    );
    
    console.log(`Found ${expiredShares.length} expired shares to process`);
    
    // Process each expired share
    for (const share of expiredShares) {
      try {
        await revokeAccess(share);
        
        // Update share status in database or delete the share record
        await db.run(
          `DELETE FROM shares WHERE id = ?`,
          [share.id]
        );
        
        console.log(`Successfully processed expired share ID: ${share.id}`);
      } catch (error) {
        console.error(`Error processing expired share ID: ${share.id}`, error);
        
        // Mark share as failed to process
        await db.run(
          `UPDATE shares SET processing_status = ? WHERE id = ?`,
          ['failed', share.id]
        );
      }
    }
    
    return {
      processed: expiredShares.length,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in processExpiredShares:', error);
    return {
      processed: 0,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Process shares that need rotation
 */
export async function processRotationSchedule() {
  const db = await openDB();
  const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
  
  try {
    // Get all shares that need rotation
    const sharesToRotate = await db.all(
      `SELECT s.*, r.type, r.host, r.username, r.password, r.value
       FROM shares s
       JOIN resources r ON s.resource_id = r.id
       WHERE s.next_rotation <= ?`,
      [currentDate]
    );
    
    console.log(`Found ${sharesToRotate.length} shares to rotate`);
    
    // Process each share that needs rotation
    for (const share of sharesToRotate) {
      try {
        // Revoke old access
        await revokeAccess(share);
        
        // Create new access with the same permissions
        await createNewAccess(share);
        
        // Calculate next rotation date
        const nextRotation = calculateNextRotation(share.rotation_period, currentDate);
        
        // Update share with new credentials and rotation date
        await db.run(
          `UPDATE shares SET 
           username = ?, 
           password = ?, 
           next_rotation = ?
           WHERE id = ?`,
          [share.username, share.password, nextRotation, share.id]
        );
        
        console.log(`Successfully rotated share ID: ${share.id}`);
      } catch (error) {
        console.error(`Error rotating share ID: ${share.id}`, error);
        
        // Mark share as failed to rotate
        await db.run(
          `UPDATE shares SET rotation_status = ? WHERE id = ?`,
          ['failed', share.id]
        );
      }
    }
    
    return {
      rotated: sharesToRotate.length,
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in processRotationSchedule:', error);
    return {
      rotated: 0,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Revoke access for an expired or rotated share
 */
async function revokeAccess(share) {
  const resource = {
    id: share.resource_id,
    type: share.type,
    host: share.host,
    username: share.username, 
    password: share.password,
    value: share.value,
    namespace: share.namespace // For Kubernetes resources
  };
  
  // Call the appropriate delete function based on resource type
  switch (resource.type) {
    case 'postgresql_access':
      return await deletePostgresqlUser(resource, share.username);
    
    case 'mysql_access':
      return await deleteMysqlUser(resource, share.username);
    
    case 'google_iam':
    case 'gcp_iam':
      return await deleteGcpUser(resource, share.username);
    
    case 'aws_iam':
      return await deleteAwsUser(resource, share.username);
    
    case 'kubernetes':
      return await deleteK8sUser(resource, share.username);
    
    case 'vm':
      return await deleteSshUser(resource, share.username);
    
    default:
      throw new Error(`Unsupported resource type: ${resource.type}`);
  }
}

/**
 * Create new access for a rotated share
 */
async function createNewAccess(share) {
  // Implementation for creating new access
  // Similar to functions in share.js but adapted for rotation
  throw new Error('Not implemented yet');
}

/**
 * Calculate the next rotation date based on rotation period
 */
function calculateNextRotation(rotationPeriod, currentDate) {
  const date = new Date(currentDate);
  
  switch(rotationPeriod) {
    case '1_week':
      date.setDate(date.getDate() + 7);
      break;
    case '2_week':
      date.setDate(date.getDate() + 14);
      break;
    case '1_month':
      date.setMonth(date.getMonth() + 1);
      break;
    case '3_month':
      date.setMonth(date.getMonth() + 3);
      break;
    case '6_month':
      date.setMonth(date.getMonth() + 6);
      break;
    case '1_year':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to 1 month
  }
  
  return date.toISOString().split('T')[0]; // Return in YYYY-MM-DD format
}
