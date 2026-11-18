// Embedded Postgres for machines without Docker. Data lives in apps/api/.pgdata
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

const dir = new URL('../.pgdata', import.meta.url).pathname;
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'realestate', password: 'realestate', port: 5441, persistent: true });
const fresh = !existsSync(`${dir}/PG_VERSION`);
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('realestate');
console.log('Postgres ready on postgresql://realestate:realestate@localhost:5441/realestate');
process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
process.on('SIGTERM', async () => { await pg.stop(); process.exit(0); });
