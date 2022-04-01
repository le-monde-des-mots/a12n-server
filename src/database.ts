/* eslint no-console: 0 */
import { knex, Knex } from 'knex';
import * as path from 'node:path';
import './env';

const db: Knex = knex(getSettings());

export async function init() {

  // eslint-disable-next-line no-console
  console.log('Running database migrations');
  await db.migrate.latest();

}

export default db;

export function getSettings(): Knex.Config {

  let connection: Knex.MySql2ConnectionConfig | Knex.PgConnectionConfig;
  let client;

  // Declare explicitly the client to use, or try to infer it.
  if (Object.keys(process.env).includes('PG_DATABASE')) {
    client = 'pg';
    connection = {
      host: process.env.PG_HOST || '127.0.0.1',
      port: parseInt(process.env.PG_PORT as string, 10) || 5432,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
    };
  } else if (Object.keys(process.env).includes('MYSQL_DATABASE')) {
    client = 'mysql2';
    connection = {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT as string, 10) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    };

    if (process.env.MYSQL_INSTANCE_CONNECTION_NAME) {
      (connection as Knex.MySql2ConnectionConfig).socketPath = '/cloudsql/' + process.env.MYSQL_INSTANCE_CONNECTION_NAME;
    } else {
      delete connection.host;
      delete connection.port;
    }
  } else {
    throw new Error('No database client selected, please provide either PG_DATABASE or MYSQL_DATABASE environment variables');
  }

  return {
    client,
    connection,
    searchPath: [
      connection.user as string,
      connection.database as string,
      'public'
    ],
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      loadExtensions: ['.js'],
      schemaName: connection.database as string,
    },
    pool: { min: 0, max: 10 },
    debug: process.env.DEBUG ? true : false,
  };
}

type RawMySQLResult<T> = [ T[], [] ];
interface RawPostgreSQLResult<T> {
  rows: T[];
}
type RawResult<T> = RawMySQLResult<T> | RawPostgreSQLResult<T>;

/**
 * A shortcut for easily executing select queries.
 *
 * Use of this should be phased out, but it helped with the migration from
 * befre knex.
 */
export async function query<T = any>(query: string, params: Knex.ValueDict | Knex.RawBinding[] = []): Promise<T[]> {

  // Knex returns weird typings for the raw function,
  const result = (await db.raw(query, params)) as RawResult<T>;

  if (db.client.deviceName === 'pg') {
    return (result as RawPostgreSQLResult<T>).rows;
  }

  return (result as RawMySQLResult<T>)[0];

}
