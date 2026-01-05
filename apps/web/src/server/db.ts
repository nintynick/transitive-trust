/**
 * Database abstraction layer for routers
 * Uses mock data when USE_MOCK_DATA=true, otherwise uses Neo4j
 */

export const useMockData = process.env.USE_MOCK_DATA === 'true';

// Re-export all db functions from appropriate source
// The routers should import from this file instead of directly from @ttp/db

export * from './mock-db';
