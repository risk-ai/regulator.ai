import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: '/var/run/postgresql',  // Unix socket
  database: 'vienna_dev',
  port: 5432
});

try {
  const result = await pool.query('SELECT current_user, current_database()');
  console.log('✅ Connection successful:');
  console.log(result.rows[0]);
  await pool.end();
} catch (error) {
  console.error('❌ Connection failed:');
  console.error(error.message);
  process.exit(1);
}
