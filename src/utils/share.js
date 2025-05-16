import { exec, execSync } from 'child_process';
import { chmodSync, writeFileSync, unlinkSync, existsSync, readFileSync, mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { decrypt } from './crypto';
import { NodeSSH } from 'node-ssh';

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

export async function deletePostgresqlUser(resource, username) {
  // SQL command to drop the user
  const psql = `
    PGPASSWORD=${decrypt(resource.password)} psql -h ${resource.host} -U ${resource.username} -d postgres \
    -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${username}; \
    REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${username}; \
    REVOKE ALL PRIVILEGES ON DATABASE postgres FROM ${username}; \
    DROP USER IF EXISTS ${username};"
  `;

  try {
    await execAsync(psql);
    return { success: true, message: `Successfully deleted PostgreSQL user: ${username}` };
  } catch (error) {
    throw new Error(`Failed to delete PostgreSQL user: ${error.message}`);
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

export async function deleteMysqlUser(resource, username) {
  const mysql = `
    mysql -h ${resource.host} -u ${resource.username} -p${resource.password} \
    -e "DROP USER IF EXISTS '${username}'@'%';"
  `;

  try {
    await execAsync(mysql);
    return { success: true, message: `Successfully deleted MySQL user: ${username}` };
  } catch (error) {
    throw new Error(`Failed to delete MySQL user: ${error.message}`);
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

    unlinkSync(tempKeyPath);

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

    unlinkSync(tempKeyPath);
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

    unlinkSync(tempKeyPath);
    return { 
      username: "",
      password: ""
    };
  } catch (error) {
    throw new Error(`Failed to create GCP admin user: ${error.message}`);
  }
}

export async function deleteGcpUser(resource, username) {
  const projectId = resource.host;

  // dump key to file
  const tempKeyPath = dumpKeyToFile(resource.value);

  const commands = [
    `export GOOGLE_APPLICATION_CREDENTIALS="${tempKeyPath}" && gcloud iam users delete ${username} --project=${projectId}`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }

    unlinkSync(tempKeyPath);

    return { success: true, message: `Successfully deleted GCP user: ${username}` };
  } catch (error) {
    throw new Error(`Failed to delete GCP user: ${error.message}`);
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

export async function deleteAwsUser(resource, username) {
  const commands = [
    `aws iam delete-user --user-name ${username}`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    return { success: true, message: `Successfully deleted AWS user: ${username}` };
  } catch (error) {
    throw new Error(`Failed to delete AWS user: ${error.message}`);
  }
}

export async function createViewerK8sUser(resource) {
  const username = createRandomUsername(`k8s_viewer_${resource.id}`);
  const namespace = resource.namespace || 'default';
  
  // Create temp directory for kubeconfig
  const kubeconfigPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create namespace-specific role for read-only access
    `KUBECONFIG=${kubeconfigPath} kubectl create role readonly-role --verb=get,list,watch --resource=pods,services,deployments,configmaps,secrets,ingresses,statefulsets,daemonsets,replicasets,jobs,cronjobs -n ${namespace}`,
    
    // Create service account
    `KUBECONFIG=${kubeconfigPath} kubectl create serviceaccount ${username} -n ${namespace}`,
    
    // Create role binding
    `KUBECONFIG=${kubeconfigPath} kubectl create rolebinding ${username}-binding --role=readonly-role --serviceaccount=${namespace}:${username} -n ${namespace}`,
    
    // Create token (for Kubernetes >= 1.24)
    `KUBECONFIG=${kubeconfigPath} kubectl create token ${username} -n ${namespace}`
  ];

  try {
    const results = [];
    for (let i = 0; i < commands.length; i++) {
      const { stdout } = await execAsync(commands[i]);
      results.push(stdout);
    }
    
    // The last result should be the token
    const token = results[results.length - 1].trim();
    
    // Create a user-specific kubeconfig
    const userKubeconfig = generateKubeconfig(resource.host, namespace, username, token);

    unlinkSync(kubeconfigPath);

    return { 
      username: "",
      password: userKubeconfig,
    };
  } catch (error) {
    throw new Error(`Failed to create Kubernetes viewer user: ${error.message}`);
  }
}

export async function createEditorK8sUser(resource) {
  const username = createRandomUsername(`k8s_editor_${resource.id}`);
  const namespace = resource.namespace || 'default';
  
  // Create temp directory for kubeconfig
  const kubeconfigPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create namespace-specific role for editor access
    `KUBECONFIG=${kubeconfigPath} kubectl create role editor-role --verb=get,list,watch,create,update,patch,delete --resource=pods,services,deployments,configmaps,secrets,ingresses,statefulsets,daemonsets,replicasets,jobs,cronjobs -n ${namespace}`,
    
    // Create service account
    `KUBECONFIG=${kubeconfigPath} kubectl create serviceaccount ${username} -n ${namespace}`,
    
    // Create role binding
    `KUBECONFIG=${kubeconfigPath} kubectl create rolebinding ${username}-binding --role=editor-role --serviceaccount=${namespace}:${username} -n ${namespace}`,
    
    // Create token (for Kubernetes >= 1.24)
    `KUBECONFIG=${kubeconfigPath} kubectl create token ${username} -n ${namespace}`
  ];

  try {
    const results = [];
    for (let i = 0; i < commands.length; i++) {
      const { stdout } = await execAsync(commands[i]);
      results.push(stdout);
    }
    
    // The last result should be the token
    const token = results[results.length - 1].trim();
    
    // Create a user-specific kubeconfig
    const userKubeconfig = generateKubeconfig(resource.host, namespace, username, token);

    unlinkSync(kubeconfigPath);
    
    return { 
      username: "",
      password: userKubeconfig,
    };
  } catch (error) {
    throw new Error(`Failed to create Kubernetes editor user: ${error.message}`);
  }
}

export async function createAdminK8sUser(resource) {
  const username = createRandomUsername(`k8s_admin_${resource.id}`);
  const namespace = resource.namespace || 'default';
  
  // Create temp directory for kubeconfig
  const kubeconfigPath = dumpKeyToFile(resource.value);
  
  const commands = [
    // Create service account
    `KUBECONFIG=${kubeconfigPath} kubectl create serviceaccount ${username} -n ${namespace}`,
    
    // Create cluster role binding for admin access
    `KUBECONFIG=${kubeconfigPath} kubectl create clusterrolebinding ${username}-cluster-admin-binding --clusterrole=cluster-admin --serviceaccount=${namespace}:${username}`,
    
    // Create token (for Kubernetes >= 1.24)
    `KUBECONFIG=${kubeconfigPath} kubectl create token ${username} -n ${namespace}`
  ];

  try {
    const results = [];
    for (let i = 0; i < commands.length; i++) {
      const { stdout } = await execAsync(commands[i]);
      results.push(stdout);
    }
    
    // The last result should be the token
    const token = results[results.length - 1].trim();
    
    // Create a user-specific kubeconfig
    const userKubeconfig = generateKubeconfig(resource.host, namespace, username, token);

    unlinkSync(kubeconfigPath);

    return { 
      username: "",
      password: userKubeconfig,
    };
  } catch (error) {
    throw new Error(`Failed to create Kubernetes admin user: ${error.message}`);
  }
}

export async function deleteK8sUser(resource, username) {
  const namespace = resource.namespace || 'default';
  
  const commands = [
    `KUBECONFIG=${kubeconfigPath} kubectl delete serviceaccount ${username} -n ${namespace}`,
    `KUBECONFIG=${kubeconfigPath} kubectl delete rolebinding ${username}-binding --serviceaccount=${namespace}:${username} -n ${namespace}`,
    `KUBECONFIG=${kubeconfigPath} kubectl delete role ${username}-role --serviceaccount=${namespace}:${username} -n ${namespace}`,
  ];

  try {
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    unlinkSync(kubeconfigPath);
    return { success: true, message: `Successfully deleted Kubernetes user: ${username}` };
  } catch (error) {
    throw new Error(`Failed to delete Kubernetes user: ${error.message}`);
  }
}

export async function createSshUser(resource, role) {
  const ssh = new NodeSSH();
  const username = createRandomUsername(`ssh_${resource.id}`);
  const tempDir = mkdtempSync(join(tmpdir(), 'ssh-keys-'));
  const privateKeyPath = join(tempDir, 'id_rsa');
  const publicKeyPath = join(tempDir, 'id_rsa.pub');
  
  try {
    // Generate SSH key pair
    await execAsync(`ssh-keygen -t rsa -b 4096 -f ${privateKeyPath} -N "" -C "${username}@${resource.host}"`);
    
    // Read the public key
    const publicKey = readFileSync(publicKeyPath, 'utf8').trim();
    
    // Read the private key
    const privateKey = readFileSync(privateKeyPath, 'utf8');
    
    // Connect to the VM using the resource's SSH key
    await ssh.connect({
      host: resource.host,
      username: username,
      privateKey: decrypt(resource.password)
    });
    
    // Create user with appropriate roles
    if (role === 'viewer') {
      // Create a regular user with limited roles
      await ssh.execCommand(`useradd -m -s /bin/bash ${username}`);
    } else if (role === 'editor') {
      // Create a user with sudo access for specific commands
      await ssh.execCommand(`useradd -m -s /bin/bash ${username}`);
      await ssh.execCommand(`echo "${username} ALL=(ALL) /bin/ls, /usr/bin/apt, /usr/bin/apt-get" | tee /etc/sudoers.d/${username}`);
    } else if (role === 'admin') {
      // Create a user with full sudo access
      await ssh.execCommand(`useradd -m -s /bin/bash ${username}`);
      await ssh.execCommand(`usermod -aG sudo ${username}`);
    }
    
    // Create .ssh directory and set roles
    await ssh.execCommand(`mkdir -p /home/${username}/.ssh`);
    await ssh.execCommand(`echo "${publicKey}" > /home/${username}/.ssh/authorized_keys`);
    await ssh.execCommand(`chown -R ${username}:${username} /home/${username}/.ssh`);
    await ssh.execCommand(`chmod 700 /home/${username}/.ssh`);
    await ssh.execCommand(`chmod 600 /home/${username}/.ssh/authorized_keys`);
    
    // Clean up temporary files
    unlinkSync(privateKeyPath);
    unlinkSync(publicKeyPath);
    rmdirSync(tempDir);
    
    // Disconnect SSH
    ssh.dispose();
    
    return {
      username: username,
      password: privateKey
    };
  } catch (error) {
    // Clean up on error
    try {
      if (existsSync(privateKeyPath)) unlinkSync(privateKeyPath);
      if (existsSync(publicKeyPath)) unlinkSync(publicKeyPath);
      if (existsSync(tempDir)) rmdirSync(tempDir);
      ssh.dispose();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    throw new Error(`Failed to create SSH user: ${error.message}`);
  }
}

export async function deleteSshUser(resource, username) {
  const ssh = new NodeSSH();
  
  try {
    // Connect to the VM using the resource's SSH key
    await ssh.connect({
      host: resource.host,
      username: username,
      privateKey: decrypt(resource.password)
    });
    
    // Delete the user and their home directory
    await ssh.execCommand(`userdel -r ${username}`);
    
    // Remove any sudoers file if it exists
    await ssh.execCommand(`rm -f /etc/sudoers.d/${username}`);
    
    // Disconnect SSH
    ssh.dispose();
    
    return { success: true, message: `Successfully deleted SSH user: ${username}` };
  } catch (error) {
    if (ssh) ssh.dispose();
    throw new Error(`Failed to delete SSH user: ${error.message}`);
  }
}


function generateKubeconfig(server, namespace, username, token) {
  return `apiVersion: v1
kind: Config
preferences: {}
clusters:
- cluster:
    server: ${server}
    insecure-skip-tls-verify: true
  name: ${namespace}-cluster
contexts:
- context:
    cluster: ${namespace}-cluster
    namespace: ${namespace}
    user: ${username}
  name: ${namespace}-context
current-context: ${namespace}-context
users:
- name: ${username}
  user:
    token: ${token}
`;
}

export function createUser(resource, role) {
  switch (resource.type) {
    case "postgresql_access":
      if (role == "viewer") {
        return createViewerPgUser(resource);
      } else if (role == "editor") {
        return createEditorPgUser(resource);
      } else if (role == "superuser") {
        return createAdminPgUser(resource);
      }
    case "mysql_access":
      if (role == "viewer") {
        return createViewerMysqlUser(resource);
      } else if (role == "editor") {
        return createEditorMysqlUser(resource);
      } else if (role == "superuser") {
        return createSuperuserMysqlUser(resource);
      }
    case "google_iam":
      if (role == "viewer") {
        return createViewerGcpUser(resource);
      } else if (role == "editor") {
        return createEditorGcpUser(resource);
      } else if (role == "superuser") {
        return createAdminGcpUser(resource);
      }
    case "vm":
      if (role == "viewer") {
        return createViewerAwsUser(resource);
      } else if (role == "editor") {
        return createEditorAwsUser(resource);
      } else if (role == "superuser") {
        return createAdminAwsUser(resource);
      }
    case "gcp_iam":
      if (role == "viewer") {
        return createViewerGcpUser(resource);
      } else if (role == "editor") {
        return createEditorGcpUser(resource);
      } else if (role == "superuser") {
        return createAdminGcpUser(resource);
      }
    case "aws_iam":
      if (role == "viewer") {
        return createViewerAwsUser(resource);
      } else if (role == "editor") {
        return createEditorAwsUser(resource);
      } else if (role == "superuser") {
        return createAdminAwsUser(resource);
      }
    case "kubernetes":
      if (role == "viewer") {
        return createViewerK8sUser(resource);
      } else if (role == "editor") {
        return createEditorK8sUser(resource);
      } else if (role == "admin") {
        return createAdminK8sUser(resource);
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

