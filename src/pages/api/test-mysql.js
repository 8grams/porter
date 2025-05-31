import { testMysqlConnection } from '../../utils/db_connection';

export async function POST({ request }) {
  try {
    const { host, username, password } = await request.json();
    const result = await testMysqlConnection(host, username, password);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 