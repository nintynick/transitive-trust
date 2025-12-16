/**
 * Neo4j database client
 */

import neo4j, { Driver, Session, QueryResult, RecordShape } from 'neo4j-driver';

let driver: Driver | null = null;

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
}

/**
 * Initialize the Neo4j driver
 */
export function initDriver(config: Neo4jConfig): Driver {
  if (driver) {
    return driver;
  }

  driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password)
  );

  return driver;
}

/**
 * Get the Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call initDriver() first.');
  }
  return driver;
}

/**
 * Close the Neo4j driver
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Get a new session
 */
export function getSession(database?: string): Session {
  return getDriver().session({
    database: database ?? process.env.NEO4J_DATABASE ?? 'neo4j',
  });
}

/**
 * Execute a read-only query with automatic session management
 */
export async function readQuery<T extends RecordShape = RecordShape>(
  cypher: string,
  params: Record<string, unknown> = {},
  database?: string
): Promise<T[]> {
  const session = getSession(database);
  try {
    const result = await session.executeRead((tx) =>
      tx.run<T>(cypher, params)
    );
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Execute a write query with automatic session management
 */
export async function writeQuery<T extends RecordShape = RecordShape>(
  cypher: string,
  params: Record<string, unknown> = {},
  database?: string
): Promise<T[]> {
  const session = getSession(database);
  try {
    const result = await session.executeWrite((tx) =>
      tx.run<T>(cypher, params)
    );
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function withTransaction<T>(
  fn: (tx: {
    run: <R extends RecordShape>(
      cypher: string,
      params?: Record<string, unknown>
    ) => Promise<QueryResult<R>>;
  }) => Promise<T>,
  mode: 'read' | 'write' = 'write',
  database?: string
): Promise<T> {
  const session = getSession(database);
  try {
    if (mode === 'read') {
      return await session.executeRead((tx) => fn(tx));
    } else {
      return await session.executeWrite((tx) => fn(tx));
    }
  } finally {
    await session.close();
  }
}

/**
 * Verify database connectivity
 */
export async function verifyConnectivity(): Promise<boolean> {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert Neo4j Integer to JavaScript number
 */
export function toNumber(value: unknown): number {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

/**
 * Convert Neo4j DateTime to JavaScript Date
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (neo4j.isDateTime(value) || neo4j.isDate(value)) {
    return new Date(value.toString());
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return null;
}
