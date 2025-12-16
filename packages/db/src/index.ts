/**
 * @ttp/db
 * Database layer for Transitive Trust Protocol
 */

// Neo4j client
export {
  initDriver,
  getDriver,
  closeDriver,
  getSession,
  readQuery,
  writeQuery,
  withTransaction,
  verifyConnectivity,
  toNumber,
  toDate,
} from './neo4j/client.js';

// Queries
export * from './neo4j/queries/index.js';
