import { exec, execSync } from 'child_process';
import { chmodSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { decrypt } from './crypto';

const execAsync = promisify(exec);

export async function createViewerPgUser(resource) {
  // create new PG user with password
  const username = createRandomUsername(`pg_viewer_${resource.id}`);
  const password = createRandomPassword();
  
  const psql = `
    PGPASSWORD=${decrypt(resource.password)} psql -h ${resource.host} -U ${resource.username} -d postgres \ 
    -c "CREATE USER ${username} WITH PASSWORD '${password}'; \
    GRANT CONNECT ON DATABASE postgres TO ${username}; \
    GRANT USAGE ON SCHEMA public TO ${username}; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${username}; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${username};
  `;

  try {
    await execAsync(psql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create viewer user: ${error.message}`);
  }
}

export async function createEditorPgUser(resource) {
  // create new PG user with password
  const username = createRandomUsername(`pg_editor_${resource.id}`);
  const password = createRandomPassword();
  
  const psql = `
    PGPASSWORD=${decrypt(resource.password)} psql -h ${resource.host} -U ${resource.username} -d postgres \ 
    -c "CREATE USER ${username} WITH PASSWORD '${password}'; \
    GRANT CONNECT ON DATABASE postgres TO ${username}; \
    GRANT USAGE ON SCHEMA public TO ${username}; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${username}; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${username};
  `;

  try {
    await execAsync(psql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create editor user: ${error.message}`);
  }
}

export async function createAdminPgUser(resource) {
  // create new PG superuser with password
  const username = createRandomUsername(`pg_superuser_${resource.id}`);
  const password = createRandomPassword();
  
  const psql = `
    PGPASSWORD=${resource.password} psql -h ${resource.host} -U ${resource.username} -d postgres \ 
    -c "CREATE USER ${username} WITH PASSWORD '${password}' SUPERUSER; \
    GRANT ALL PRIVILEGES ON DATABASE postgres TO ${username}; \
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username}; \
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username}; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${username}; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${username};
  `;

  try {
    await execAsync(psql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create superuser: ${error.message}`);
  }
}

export async function createViewerMysqlUser(resource) {
  const username = createRandomUsername(`mysql_viewer_${resource.id}`);
  const password = createRandomPassword();
  
  const mysql = `
    mysql -h ${resource.host} -u ${resource.username} -p${resource.password} \
    -e "CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'; \
    GRANT SELECT ON ${resource.database}.* TO '${username}'@'%'; \
    FLUSH PRIVILEGES;"
  `;

  try {
    await execAsync(mysql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create MySQL viewer user: ${error.message}`);
  }
}

export async function createEditorMysqlUser(resource) {
  const username = createRandomUsername(`mysql_editor_${resource.id}`);
  const password = createRandomPassword();
  
  const mysql = `
    mysql -h ${resource.host} -u ${resource.username} -p${resource.password} \
    -e "CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ${resource.database}.* TO '${username}'@'%'; \
    FLUSH PRIVILEGES;"
  `;

  try {
    await execAsync(mysql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create MySQL editor user: ${error.message}`);
  }
}

export async function createSuperuserMysqlUser(resource) {
  const username = createRandomUsername(`superuser_${resource.id}`);
  const password = createRandomPassword();
  
  const mysql = `
    mysql -h ${resource.host} -u ${resource.username} -p${resource.password} \
    -e "CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'; \
    GRANT ALL PRIVILEGES ON ${resource.database}.* TO '${username}'@'%' WITH GRANT OPTION; \
    FLUSH PRIVILEGES;"
  `;

  try {
    await execAsync(mysql);
    return { username, password };
  } catch (error) {
    throw new Error(`Failed to create MySQL superuser: ${error.message}`);
  }
}

export async function createViewerGcpUser(resource, user) {
  const projectId = resource.host;

  // dump key to file
  const tempKeyPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create user account
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && gcloud iam users create ${user.name} --display-name="${user.name}" --project=${projectId}`,
    // Grant viewer role
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && gcloud projects add-iam-policy-binding ${projectId} --member="user:${user.email}" --role="roles/viewer"`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    return { 
      username: "",
      password: ""
    };
  } catch (error) {
    throw new Error(`Failed to create GCP viewer user: ${error.message}`);
  }
}

export async function createEditorGcpUser(resource, user) {
  const projectId = resource.host;

  // dump key to file
  const tempKeyPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create user account
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && \
    gcloud iam users create ${user.name} --display-name="${user.name}" --project=${projectId}`,
    // Grant editor role
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && \
    gcloud projects add-iam-policy-binding ${projectId} --member="user:${user.email}" --role="roles/editor"`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    return { 
      username: "",
      password: ""
    };
  } catch (error) {
    throw new Error(`Failed to create GCP editor user: ${error.message}`);
  }
}

export async function createAdminGcpUser(resource, user) {
  const projectId = resource.host;

  // dump key to file
  const tempKeyPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create user account
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && \
     gcloud iam users create ${user.name} --display-name="${user.name}" --project=${projectId}`,
    // Grant owner role
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && \
     gcloud projects add-iam-policy-binding ${projectId} --member="user:${user.email}" --role="roles/owner"`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    return { 
      username: "",
      password: ""
    };
  } catch (error) {
    throw new Error(`Failed to create GCP admin user: ${error.message}`);
  }
}

export async function createViewerAwsUser(resource) {
  const username = createRandomUsername(`viewer_${resource.id}`);
  const password = createRandomPassword();
  
  const commands = [
    // Create IAM user
    `aws iam create-user --user-name ${username}`,
    // Create access key
    `aws iam create-access-key --user-name ${username}`,
    // Attach read-only policy
    `aws iam attach-user-policy --user-name ${username} --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess`,
    // Create login profile with password
    `aws iam create-login-profile --user-name ${username} --password ${password} --password-reset-required`
  ];

  try {
    const results = [];
    for (const cmd of commands) {
      const { stdout } = execSync(cmd);
      results.push(JSON.parse(stdout));
    }
    
    return {
      username: results[1].AccessKey,
      password: results[1].SecretAccessKey
    };
  } catch (error) {
    throw new Error(`Failed to create AWS viewer user: ${error.message}`);
  }
}

export async function createEditorAwsUser(resource) {
  const username = createRandomUsername(`editor_${resource.id}`);
  const password = createRandomPassword();
  
  const commands = [
    // Create IAM user
    `aws iam create-user --user-name ${username}`,
    // Create access key
    `aws iam create-access-key --user-name ${username}`,
    // Attach power user policy (can do everything except IAM)
    `aws iam attach-user-policy --user-name ${username} --policy-arn arn:aws:iam::aws:policy/PowerUserAccess`,
    // Create login profile with password
    `aws iam create-login-profile --user-name ${username} --password ${password} --password-reset-required`
  ];

  try {
    const results = [];
    for (const cmd of commands) {
      const { stdout } = execSync(cmd);
      results.push(JSON.parse(stdout));
    }
    
    return {
      username: results[1].AccessKey,
      password: results[1].SecretAccessKey
    };
  } catch (error) {
    throw new Error(`Failed to create AWS editor user: ${error.message}`);
  }
}

export async function createAdminAwsUser(resource) {
  const username = createRandomUsername(`admin_${resource.id}`);
  const password = createRandomPassword();
  
  const commands = [
    // Create IAM user
    `aws iam create-user --user-name ${username}`,
    // Create access key
    `aws iam create-access-key --user-name ${username}`,
    // Attach administrator policy
    `aws iam attach-user-policy --user-name ${username} --policy-arn arn:aws:iam::aws:policy/AdministratorAccess`,
    // Create login profile with password
    `aws iam create-login-profile --user-name ${username} --password ${password} --password-reset-required`
  ];

  try {
    const results = [];
    for (const cmd of commands) {
      const { stdout } = await execAsync(cmd);
      results.push(JSON.parse(stdout));
    }
    
    return {
      username: results[1].AccessKey,
      password: results[1].SecretAccessKey
    };
  } catch (error) {
    throw new Error(`Failed to create AWS admin user: ${error.message}`);
  }
}

export function createUser(resource, permission) {
  switch (resource.type) {
    case "postgresql_access":
      if (permission == "viewer") {
        return createViewerPgUser(resource);
      } else if (permission == "editor") {
        return createEditorPgUser(resource);
      } else if (permission == "superuser") {
        return createAdminPgUser(resource);
      }
    case "mysql_access":
      if (permission == "viewer") {
        return createViewerMysqlUser(resource);
      } else if (permission == "editor") {
        return createEditorMysqlUser(resource);
      } else if (permission == "superuser") {
        return createSuperuserMysqlUser(resource);
      }
    case "google_iam":
      if (permission == "viewer") {
        return createViewerGcpUser(resource);
      } else if (permission == "editor") {
        return createEditorGcpUser(resource);
      } else if (permission == "superuser") {
        return createAdminGcpUser(resource);
      }
    case "vm":
      if (permission == "viewer") {
        return createViewerAwsUser(resource);
      } else if (permission == "editor") {
        return createEditorAwsUser(resource);
      } else if (permission == "superuser") {
        return createAdminAwsUser(resource);
      }
    case "gcp_iam":
      if (permission == "viewer") {
        return createViewerGcpUser(resource);
      } else if (permission == "editor") {
        return createEditorGcpUser(resource);
      } else if (permission == "superuser") {
        return createAdminGcpUser(resource);
      }
    case "aws_iam":
      if (permission == "viewer") {
        return createViewerAwsUser(resource);
      } else if (permission == "editor") {
        return createEditorAwsUser(resource);
      } else if (permission == "superuser") {
        return createAdminAwsUser(resource);
      }
    default:
      throw new Error(`Unsupported resource type: ${resource.type}`);
  }
}

function createRandomPassword() {
  return Math.random().toString(36).slice(-8);
}

function createRandomUsername(prefix) {
  return `${prefix}_${Math.random().toString(36).substring(2, 8)}`;
}

function dumpKeyToFile(key) {
  const tempKeyPath = join(tmpdir(), `tempkey-${Date.now()}`);
  writeFileSync(tempKeyPath, decrypt(key));
  chmodSync(tempKeyPath, 0o600);
  return tempKeyPath;
}

