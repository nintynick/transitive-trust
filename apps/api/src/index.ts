/**
 * Transitive Trust Protocol API Server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';

import { config } from './config/env.js';
import { appRouter, type AppRouter } from './trpc/router.js';
import { createContext } from './trpc/trpc.js';
import { initDriver, closeDriver, verifyConnectivity } from '@ttp/db';

async function main() {
  // Initialize Neo4j driver
  console.log(`Connecting to Neo4j at ${config.neo4j.uri}...`);
  initDriver(config.neo4j);

  // Verify connectivity
  const connected = await verifyConnectivity();
  if (!connected) {
    console.error('Failed to connect to Neo4j. Is the database running?');
    console.log('You can start it with: docker compose -f infrastructure/docker/docker-compose.yml up -d');
    process.exit(1);
  }
  console.log('Connected to Neo4j');

  // Create Fastify server
  const server = Fastify({
    logger: config.nodeEnv === 'development',
  });

  // Register CORS
  await server.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  // Register tRPC
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`Error in tRPC handler on path '${path}':`, error);
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  // Health check endpoint
  server.get('/health', async () => {
    const dbConnected = await verifyConnectivity();
    return {
      status: dbConnected ? 'healthy' : 'degraded',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await server.close();
    await closeDriver();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`\n🚀 TTP API Server running at http://localhost:${config.port}`);
    console.log(`   tRPC endpoint: http://localhost:${config.port}/trpc`);
    console.log(`   Health check:  http://localhost:${config.port}/health\n`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
