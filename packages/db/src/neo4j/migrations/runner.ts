/**
 * Neo4j Migration Runner
 * Runs schema migrations against the database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDriver, closeDriver, writeQuery, getSession } from '../client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
}

async function runMigration(
  name: string,
  cypher: string
): Promise<MigrationResult> {
  console.log(`Running migration: ${name}`);

  // Split by semicolons, filter out comments and empty statements
  const statements = cypher
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('//'));

  const session = getSession();

  try {
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`  Executing: ${statement.substring(0, 60)}...`);
        await session.run(statement);
      }
    }

    console.log(`  ✓ Migration ${name} completed successfully`);
    return { name, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Migration ${name} failed: ${message}`);
    return { name, success: false, error: message };
  } finally {
    await session.close();
  }
}

async function main(): Promise<void> {
  // Initialize driver from environment
  const config = {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'trustpassword',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  };

  console.log(`\nConnecting to Neo4j at ${config.uri}...`);
  initDriver(config);

  const results: MigrationResult[] = [];

  // Run schema migration
  const schemaPath = join(__dirname, '001-schema.cypher');
  const schemaCypher = readFileSync(schemaPath, 'utf-8');
  results.push(await runMigration('001-schema', schemaCypher));

  // Close driver
  await closeDriver();

  // Print summary
  console.log('\n=== Migration Summary ===');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed migrations:');
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    process.exit(1);
  }

  console.log('\n✓ All migrations completed successfully');
}

main().catch((error) => {
  console.error('Migration runner failed:', error);
  process.exit(1);
});
