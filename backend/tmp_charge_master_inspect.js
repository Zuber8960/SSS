const db = require('./config/db');

(async () => {
  const cols = await db.raw(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'sss' AND table_name = 'ssm_charge_master'
    ORDER BY ordinal_position
  `);
  console.log('COLS', JSON.stringify(cols.rows, null, 2));
  const rows = await db('sss.ssm_charge_master').select('*').orderBy('charge_code').limit(80);
  console.log('ROWS', JSON.stringify(rows, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
