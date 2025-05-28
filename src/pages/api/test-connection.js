import { testPostgresConnection, testMysqlConnection } from "../../utils/db_connection";

export async function POST({ request }) {
  try {
    const { type, host, username, password } = await request.json();

    if (!host || !username || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;
    if (type === 'postgres') {
      result = await testPostgresConnection(host, username, password);
    } else if (type === 'mysql') {
      result = await testMysqlConnection(host, username, password);
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid database type' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 