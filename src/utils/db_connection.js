import { Client } from 'pg';
import mysql from 'mysql2/promise';

export async function testPostgresConnection(host, username, password) {
  const client = new Client({
    host,
    user: username,
    password: password,
    database: 'postgres',
    port: 5432,
  });

  try {
    await client.connect();
    await client.end();
    return { success: true, message: 'Successfully connected to PostgreSQL database' };
  } catch (error) {
    return { success: false, message: `Failed to connect to PostgreSQL: ${error.message}` };
  }
}

export async function testMysqlConnection(host, username, password) {
  try {
    const connection = await mysql.createConnection({
      host,
      user: username,
      password: password,
      port: 3306
    });
    
    await connection.end();
    return { success: true, message: 'Successfully connected to MySQL database' };
  } catch (error) {
    return { success: false, message: `Failed to connect to MySQL: ${error.message}` };
  }
} 