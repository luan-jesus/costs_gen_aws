import pg from 'pg';

var pgClient = null;

async function openConnection() {
  const { Client } = pg
  pgClient = new Client()
  pgClient.connect()
}

async function closeConnection() {
  pgClient.end();
}

async function runQuery(query = '', args = []) {
  let response = null;
  try {
    await pgClient.query('BEGIN')
    response = pgClient.query(query, args)
    await pgClient.query('COMMIT')
  } catch (e) {
    await pgClient.query('ROLLBACK')
    throw new Error(e);
  }
  return response
}


export default {
  openConnection,
  closeConnection,
  runQuery
}