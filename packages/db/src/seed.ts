/**
 * Seed script to populate the database with meaningful test data
 * Run with: pnpm db:seed (from packages/db)
 *
 * All principals use Ethereum addresses as IDs (matching wallet-based auth)
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Find the monorepo root by looking for pnpm-workspace.yaml
function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== '/') {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = resolve(dir, '..');
  }
  return startDir;
}

const monorepoRoot = findMonorepoRoot(process.cwd());

// Load environment variables from root .env.local
config({ path: resolve(monorepoRoot, '.env.local') });
config({ path: resolve(monorepoRoot, '.env') });


import { initDriver, closeDriver, writeQuery } from './neo4j/client.js';
import {
  createPrincipal,
  createSubject,
  createTrustEdge,
  createEndorsement,
  getPrincipalById,
} from './neo4j/queries/index.js';
import type { Signature } from '@ttp/shared';

// Placeholder signature for test data (secp256k1 for Ethereum)
const testSignature: Signature = {
  algorithm: 'secp256k1',
  publicKey: '0x0000000000000000000000000000000000000000',
  signature: '0x0000000000000000000000000000000000000000000000000000000000000000',
  signedAt: new Date().toISOString(),
};

interface TestPrincipal {
  address: string; // Ethereum address is the ID
  name: string;
  bio: string;
}

interface TestSubject {
  id: string;
  name: string;
  type: 'business' | 'service' | 'product' | 'individual';
  domains: string[];
}

// Test Ethereum addresses (valid hex addresses)
// Format: 0x + 40 hex characters (0-9, a-f only)
const TEST_ADDRESSES = {
  // Main user - Nick's actual wallet address
  nick: '0x516cAfD745Ec780D20f61c0d71fe258eA765222D',
  // Close friends (a11ce = alice, b0b = bob, ca401 = carol)
  alice: '0xa11ce00000000000000000000000000000000001',
  bob: '0xb0b0000000000000000000000000000000000002',
  carol: '0xca401000000000000000000000000000000000003',
  // Acquaintances (da71d = david, e7a = eva)
  david: '0xda71d00000000000000000000000000000000004',
  eva: '0xe7a0000000000000000000000000000000000005',
  // Friends of friends
  frank: '0xf4a4c000000000000000000000000000000000006',
  grace: '0x64ace00000000000000000000000000000000007',
  henry: '0x4e44e00000000000000000000000000000000008',
  iris: '0x1415000000000000000000000000000000000009',
  jack: '0xdac0000000000000000000000000000000000010',
  // Distant connections
  kate: '0xca7e000000000000000000000000000000000011',
  leo: '0x1e00000000000000000000000000000000000012',
  maya: '0xaa7a000000000000000000000000000000000013',
  // Unknown/untrusted
  random: '0x4a4d0000000000000000000000000000000000014',
  suspicious: '0x5bad000000000000000000000000000000000015',
};

async function clearDatabase(preserveAddress?: string) {
  console.log('Clearing existing data...');
  if (preserveAddress) {
    // Delete everything except the specified principal
    await writeQuery(
      `MATCH (n) WHERE NOT (n:Principal AND n.id = $preserveId) DETACH DELETE n`,
      { preserveId: preserveAddress }
    );
    console.log(`Database cleared (preserved principal: ${preserveAddress})`);
  } else {
    await writeQuery('MATCH (n) DETACH DELETE n', {});
    console.log('Database cleared.');
  }
}

async function seed() {
  // Initialize database connection
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error('Missing required environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
  }

  console.log('Connecting to Neo4j at', uri.replace(/\/\/.*@/, '//***@'));
  initDriver({ uri, user, password });

  // Main test user address - Nick's wallet address
  const mainUserAddress = TEST_ADDRESSES.nick;

  // Check if main user exists BEFORE clearing
  const existingUser = await getPrincipalById(mainUserAddress);
  const mainUserExists = !!existingUser;

  // Clear database but preserve the main user if they exist
  await clearDatabase(mainUserExists ? mainUserAddress : undefined);

  // ============================================
  // 1. CREATE PRINCIPALS (Users with Ethereum addresses)
  // ============================================
  console.log('\nCreating principals (with Ethereum addresses)...');

  const principals: TestPrincipal[] = [];

  // Create or preserve main user (Nick)
  if (mainUserExists) {
    console.log(`  Using existing main user: ${mainUserAddress}`);
    principals.push({ address: mainUserAddress, name: 'Nick', bio: 'Main user' });
  } else {
    const mainUser = await createPrincipal({
      type: 'user',
      publicKey: mainUserAddress,
      metadata: {
        displayName: 'Nick',
        name: 'Nick',
        bio: 'Transitive Trust Protocol developer and tester',
      },
    });
    principals.push({ address: mainUser.id, name: 'Nick', bio: 'Main user' });
    console.log(`  Created main user: ${mainUserAddress}`);
  }

  // Close friends (high trust, 1 hop)
  const closeFriends = [
    { address: TEST_ADDRESSES.alice, name: 'Alice Chen', bio: 'Food blogger and restaurant critic' },
    { address: TEST_ADDRESSES.bob, name: 'Bob Martinez', bio: 'Local business owner, knows everyone' },
    { address: TEST_ADDRESSES.carol, name: 'Carol Williams', bio: 'Tech consultant, product reviewer' },
  ];

  for (const friend of closeFriends) {
    const p = await createPrincipal({
      type: 'user',
      publicKey: friend.address,
      metadata: {
        displayName: friend.name,
        name: friend.name,
        bio: friend.bio,
      },
    });
    principals.push({ address: p.id, name: friend.name, bio: friend.bio });
    console.log(`  Created: ${friend.name} (${friend.address.slice(0, 10)}...)`);
  }

  // Acquaintances (medium trust, 1 hop)
  const acquaintances = [
    { address: TEST_ADDRESSES.david, name: 'David Lee', bio: 'Occasional hiking buddy' },
    { address: TEST_ADDRESSES.eva, name: 'Eva Johnson', bio: 'Coworker from previous job' },
  ];

  for (const acq of acquaintances) {
    const p = await createPrincipal({
      type: 'user',
      publicKey: acq.address,
      metadata: {
        displayName: acq.name,
        name: acq.name,
        bio: acq.bio,
      },
    });
    principals.push({ address: p.id, name: acq.name, bio: acq.bio });
    console.log(`  Created: ${acq.name} (${acq.address.slice(0, 10)}...)`);
  }

  // Friends of friends (2 hops away)
  const friendsOfFriends = [
    { address: TEST_ADDRESSES.frank, name: 'Frank Garcia', bio: "Alice's foodie friend" },
    { address: TEST_ADDRESSES.grace, name: 'Grace Kim', bio: "Bob's business partner" },
    { address: TEST_ADDRESSES.henry, name: 'Henry Brown', bio: "Carol's tech colleague" },
    { address: TEST_ADDRESSES.iris, name: 'Iris Davis', bio: "Alice's neighbor" },
    { address: TEST_ADDRESSES.jack, name: 'Jack Wilson', bio: "Bob's cousin" },
  ];

  for (const fof of friendsOfFriends) {
    const p = await createPrincipal({
      type: 'user',
      publicKey: fof.address,
      metadata: {
        displayName: fof.name,
        name: fof.name,
        bio: fof.bio,
      },
    });
    principals.push({ address: p.id, name: fof.name, bio: fof.bio });
    console.log(`  Created: ${fof.name} (${fof.address.slice(0, 10)}...)`);
  }

  // Distant connections (3 hops)
  const distantConnections = [
    { address: TEST_ADDRESSES.kate, name: 'Kate Thompson', bio: "Frank's wife" },
    { address: TEST_ADDRESSES.leo, name: 'Leo Anderson', bio: "Grace's accountant" },
    { address: TEST_ADDRESSES.maya, name: 'Maya Patel', bio: "Henry's roommate" },
  ];

  for (const dc of distantConnections) {
    const p = await createPrincipal({
      type: 'user',
      publicKey: dc.address,
      metadata: {
        displayName: dc.name,
        name: dc.name,
        bio: dc.bio,
      },
    });
    principals.push({ address: p.id, name: dc.name, bio: dc.bio });
    console.log(`  Created: ${dc.name} (${dc.address.slice(0, 10)}...)`);
  }

  // Untrusted/unknown users
  const unknownUsers = [
    { address: TEST_ADDRESSES.random, name: 'Random Reviewer', bio: 'No connections to your network' },
    { address: TEST_ADDRESSES.suspicious, name: 'Suspicious Sam', bio: 'Account created yesterday' },
  ];

  for (const unk of unknownUsers) {
    const p = await createPrincipal({
      type: 'user',
      publicKey: unk.address,
      metadata: {
        displayName: unk.name,
        name: unk.name,
        bio: unk.bio,
      },
    });
    principals.push({ address: p.id, name: unk.name, bio: unk.bio });
    console.log(`  Created: ${unk.name} (${unk.address.slice(0, 10)}...)`);
  }

  // Helper to find principal by name
  const findPrincipal = (name: string) => {
    const p = principals.find(p => p.name === name);
    if (!p) throw new Error(`Principal not found: ${name}`);
    return p;
  };

  // ============================================
  // 2. CREATE SUBJECTS (Things to review)
  // ============================================
  console.log('\nCreating subjects...');

  const subjects: TestSubject[] = [];

  // DeFi Protocols
  const defiProtocols = [
    { name: 'Uniswap', type: 'service' as const, domains: ['defi', 'dex'] },
    { name: 'Aave', type: 'service' as const, domains: ['defi', 'lending'] },
    { name: 'Compound', type: 'service' as const, domains: ['defi', 'lending'] },
    { name: 'Curve Finance', type: 'service' as const, domains: ['defi', 'dex'] },
  ];

  for (const p of defiProtocols) {
    const s = await createSubject({
      type: p.type,
      canonicalName: p.name,
      domains: p.domains,
    });
    subjects.push({ id: s.id, name: p.name, type: p.type, domains: p.domains });
    console.log(`  Created: ${p.name}`);
  }

  // Security & Audit Services
  const securityServices = [
    { name: 'Trail of Bits', type: 'service' as const, domains: ['security', 'audit'] },
    { name: 'OpenZeppelin', type: 'service' as const, domains: ['security', 'audit'] },
    { name: 'Consensys Diligence', type: 'service' as const, domains: ['security', 'audit'] },
  ];

  for (const svc of securityServices) {
    const s = await createSubject({
      type: svc.type,
      canonicalName: svc.name,
      domains: svc.domains,
    });
    subjects.push({ id: s.id, name: svc.name, type: svc.type, domains: svc.domains });
    console.log(`  Created: ${svc.name}`);
  }

  // Hardware & Wallets
  const walletProducts = [
    { name: 'Ledger Nano X', type: 'product' as const, domains: ['wallets', 'hardware'] },
    { name: 'Trezor Model T', type: 'product' as const, domains: ['wallets', 'hardware'] },
    { name: 'Rainbow Wallet', type: 'product' as const, domains: ['wallets', 'mobile'] },
  ];

  for (const prod of walletProducts) {
    const s = await createSubject({
      type: prod.type,
      canonicalName: prod.name,
      domains: prod.domains,
    });
    subjects.push({ id: s.id, name: prod.name, type: prod.type, domains: prod.domains });
    console.log(`  Created: ${prod.name}`);
  }

  // More DeFi / Web3 Services
  const moreDefi = [
    { name: 'Lido', type: 'service' as const, domains: ['defi', 'staking'] },
    { name: 'Eigenlayer', type: 'service' as const, domains: ['defi', 'staking'] },
    { name: 'Chainlink', type: 'service' as const, domains: ['infrastructure', 'oracles'] },
    { name: 'The Graph', type: 'service' as const, domains: ['infrastructure', 'indexing'] },
    { name: 'Alchemy', type: 'service' as const, domains: ['infrastructure', 'rpc'] },
  ];

  for (const p of moreDefi) {
    const s = await createSubject({
      type: p.type,
      canonicalName: p.name,
      domains: p.domains,
    });
    subjects.push({ id: s.id, name: p.name, type: p.type, domains: p.domains });
    console.log(`  Created: ${p.name}`);
  }

  // NFT Marketplaces & Tools
  const nftServices = [
    { name: 'OpenSea', type: 'service' as const, domains: ['nft', 'marketplace'] },
    { name: 'Blur', type: 'service' as const, domains: ['nft', 'marketplace'] },
    { name: 'Zora', type: 'service' as const, domains: ['nft', 'protocol'] },
  ];

  for (const svc of nftServices) {
    const s = await createSubject({
      type: svc.type,
      canonicalName: svc.name,
      domains: svc.domains,
    });
    subjects.push({ id: s.id, name: svc.name, type: svc.type, domains: svc.domains });
    console.log(`  Created: ${svc.name}`);
  }

  // Helper to find subject by name
  const findSubject = (name: string) => {
    const s = subjects.find(s => s.name === name);
    if (!s) throw new Error(`Subject not found: ${name}`);
    return s;
  };

  // ============================================
  // 3. CREATE TRUST EDGES (Network connections)
  // ============================================
  console.log('\nCreating trust edges...');

  // Nick -> Close friends (high trust)
  const mainUserEdges = [
    { to: 'Alice Chen', weight: 0.95, domain: '*' },
    { to: 'Bob Martinez', weight: 0.90, domain: '*' },
    { to: 'Carol Williams', weight: 0.85, domain: 'tech' },
    { to: 'David Lee', weight: 0.60, domain: '*' },
    { to: 'Eva Johnson', weight: 0.50, domain: '*' },
  ];

  for (const edge of mainUserEdges) {
    await createTrustEdge(
      findPrincipal('Nick').address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  Nick -> ${edge.to} (${edge.weight}, ${edge.domain})`);
  }

  // Alice's connections
  const aliceEdges = [
    { to: 'Frank Garcia', weight: 0.90, domain: 'food' },
    { to: 'Iris Davis', weight: 0.75, domain: '*' },
    { to: 'Bob Martinez', weight: 0.70, domain: '*' },
  ];

  for (const edge of aliceEdges) {
    await createTrustEdge(
      findPrincipal('Alice Chen').address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  Alice -> ${edge.to} (${edge.weight})`);
  }

  // Bob's connections
  const bobEdges = [
    { to: 'Grace Kim', weight: 0.95, domain: '*' },
    { to: 'Jack Wilson', weight: 0.80, domain: '*' },
    { to: 'Alice Chen', weight: 0.65, domain: 'food' },
  ];

  for (const edge of bobEdges) {
    await createTrustEdge(
      findPrincipal('Bob Martinez').address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  Bob -> ${edge.to} (${edge.weight})`);
  }

  // Carol's connections
  const carolEdges = [
    { to: 'Henry Brown', weight: 0.90, domain: 'tech' },
    { to: 'Eva Johnson', weight: 0.60, domain: '*' },
  ];

  for (const edge of carolEdges) {
    await createTrustEdge(
      findPrincipal('Carol Williams').address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  Carol -> ${edge.to} (${edge.weight})`);
  }

  // 3rd degree connections
  const thirdDegreeEdges = [
    { from: 'Frank Garcia', to: 'Kate Thompson', weight: 0.95, domain: '*' },
    { from: 'Grace Kim', to: 'Leo Anderson', weight: 0.80, domain: '*' },
    { from: 'Henry Brown', to: 'Maya Patel', weight: 0.85, domain: '*' },
  ];

  for (const edge of thirdDegreeEdges) {
    await createTrustEdge(
      findPrincipal(edge.from).address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  ${edge.from} -> ${edge.to} (${edge.weight})`);
  }

  // ============================================
  // 4. CREATE ENDORSEMENTS (Reviews)
  // ============================================
  console.log('\nCreating endorsements...');

  // Uniswap - mixed reviews from different trust levels
  const uniswapReviews = [
    { author: 'Alice Chen', rating: 0.95, summary: 'Best DEX in the space. V3 concentrated liquidity is game-changing.', verified: true },
    { author: 'Frank Garcia', rating: 0.88, summary: 'Reliable swaps, great liquidity. Gas can be expensive on L1.', verified: true },
    { author: 'Bob Martinez', rating: 0.85, summary: 'Been using it since V1. Rock solid and trustworthy.', verified: false },
    { author: 'Random Reviewer', rating: 0.3, summary: 'Lost money on impermanent loss. Terrible protocol!', verified: false },
  ];

  for (const review of uniswapReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Uniswap').id,
        domain: 'defi',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Uniswap (${review.rating})`);
  }

  // Aave
  const aaveReviews = [
    { author: 'Alice Chen', rating: 0.92, summary: 'Best lending protocol. Safety module gives me confidence.', verified: true },
    { author: 'Iris Davis', rating: 0.88, summary: 'Great for earning yield on stables. V3 is even better.', verified: true },
    { author: 'Kate Thompson', rating: 0.78, summary: 'Good rates but liquidation thresholds can be risky.', verified: false },
  ];

  for (const review of aaveReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Aave').id,
        domain: 'defi',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Aave (${review.rating})`);
  }

  // Trail of Bits
  const tobReviews = [
    { author: 'Bob Martinez', rating: 0.95, summary: 'Top-tier auditors. Found critical bugs others missed.', verified: true },
    { author: 'Grace Kim', rating: 0.92, summary: 'Expensive but worth it. Their reports are incredibly thorough.', verified: true },
    { author: 'Jack Wilson', rating: 0.88, summary: 'Great team, professional communication throughout.', verified: true },
    { author: 'Suspicious Sam', rating: 0.99, summary: 'BEST AUDITORS EVER!!!!! HIRE THEM!!!!!', verified: false },
  ];

  for (const review of tobReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Trail of Bits').id,
        domain: 'security',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'one-time' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Trail of Bits (${review.rating})`);
  }

  // Ledger Nano X
  const ledgerReviews = [
    { author: 'Carol Williams', rating: 0.85, summary: 'Solid hardware wallet. Bluetooth is convenient but battery life could be better.', verified: true },
    { author: 'Henry Brown', rating: 0.78, summary: 'Good security but the Ledger Live software is clunky.', verified: true },
    { author: 'Maya Patel', rating: 0.65, summary: 'Concerned after the data breach. Hardware is fine though.', verified: false },
    { author: 'Eva Johnson', rating: 0.80, summary: 'Easy to set up. Supports lots of chains.', verified: false },
  ];

  for (const review of ledgerReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Ledger Nano X').id,
        domain: 'wallets',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Ledger Nano X (${review.rating})`);
  }

  // Lido
  const lidoReviews = [
    { author: 'David Lee', rating: 0.88, summary: 'Easy staking with good APY. stETH is widely supported.', verified: true },
    { author: 'Bob Martinez', rating: 0.85, summary: 'Been staking since the merge. Reliable and liquid.', verified: true },
    { author: 'Leo Anderson', rating: 0.70, summary: 'Good product but concerned about centralization.', verified: false },
  ];

  for (const review of lidoReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Lido').id,
        domain: 'defi',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Lido (${review.rating})`);
  }

  // OpenSea
  const openseaReviews = [
    { author: 'Iris Davis', rating: 0.75, summary: 'Biggest marketplace but fees are high. UI improved recently.', verified: true },
    { author: 'Alice Chen', rating: 0.68, summary: 'Lost market share to Blur. Still okay for browsing.', verified: true },
    { author: 'Random Reviewer', rating: 0.95, summary: 'Best NFT marketplace! Love it!', verified: false },
  ];

  for (const review of openseaReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('OpenSea').id,
        domain: 'nft',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> OpenSea (${review.rating})`);
  }

  // Alchemy
  const alchemyReviews = [
    { author: 'Frank Garcia', rating: 0.92, summary: 'Best RPC provider. Supernode is incredibly reliable.', verified: true },
    { author: 'Jack Wilson', rating: 0.88, summary: 'Great free tier. Enhanced APIs save so much time.', verified: true },
    { author: 'Bob Martinez', rating: 0.85, summary: 'Been using for 2 years. Rarely any downtime.', verified: false },
  ];

  for (const review of alchemyReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Alchemy').id,
        domain: 'infrastructure',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Alchemy (${review.rating})`);
  }

  // ============================================
  // NICK'S REVIEWS (Main user's endorsements)
  // ============================================
  console.log('\nCreating Nick\'s reviews...');

  const nicksReviews = [
    // DeFi Protocols
    { subject: 'Uniswap', domain: 'defi', rating: 0.92, summary: 'My go-to DEX. V3 is amazing for LPing. Never had issues.' },
    { subject: 'Aave', domain: 'defi', rating: 0.90, summary: 'Solid lending protocol. Great for leveraged staking strategies.' },
    { subject: 'Compound', domain: 'defi', rating: 0.82, summary: 'OG lending protocol. Interface is dated but reliable.' },
    { subject: 'Curve Finance', domain: 'defi', rating: 0.88, summary: 'Best for stable swaps. CRV rewards make it worthwhile.' },
    { subject: 'Lido', domain: 'defi', rating: 0.85, summary: 'Easy ETH staking. stETH integration everywhere is great.' },
    { subject: 'Eigenlayer', domain: 'defi', rating: 0.78, summary: 'Promising restaking concept. Still early but watching closely.' },
    // Security & Infrastructure
    { subject: 'Trail of Bits', domain: 'security', rating: 0.95, summary: 'Best auditors in the space. Worth every penny for critical contracts.' },
    { subject: 'OpenZeppelin', domain: 'security', rating: 0.90, summary: 'Their contracts are the gold standard. Defender is useful too.' },
    { subject: 'Chainlink', domain: 'infrastructure', rating: 0.88, summary: 'Essential for any serious DeFi project. CCIP looks promising.' },
    { subject: 'The Graph', domain: 'infrastructure', rating: 0.82, summary: 'Great for indexing. Subgraph development has a learning curve.' },
    { subject: 'Alchemy', domain: 'infrastructure', rating: 0.90, summary: 'Best RPC I have used. Enhanced APIs are incredibly useful.' },
    // Wallets & Products
    { subject: 'Ledger Nano X', domain: 'wallets', rating: 0.80, summary: 'Reliable hardware wallet. Bluetooth is nice but battery dies fast.' },
    { subject: 'Trezor Model T', domain: 'wallets', rating: 0.85, summary: 'Great open source option. Touchscreen UI is intuitive.' },
    { subject: 'Rainbow Wallet', domain: 'wallets', rating: 0.88, summary: 'Beautiful mobile wallet. Points program is a nice bonus.' },
  ];

  for (const review of nicksReviews) {
    await createEndorsement(
      mainUserAddress,
      {
        subject: findSubject(review.subject).id,
        domain: review.domain,
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: true, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  Nick -> ${review.subject} (${review.rating})`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('Seed completed!');
  console.log('========================================');
  console.log(`Created ${principals.length} principals (with Ethereum addresses)`);
  console.log(`Created ${subjects.length} subjects`);
  console.log('Created trust network with multiple hop distances');
  console.log('Created endorsements with varying trust levels\n');

  console.log('Main user (Nick):', mainUserAddress);
  console.log('\nNick\'s reviews: 14 endorsements created');
  console.log('Connect with wallet 0x516cAfD...222D to see the full network.\n');
  console.log('Test addresses in the network:');
  console.log(`  Alice Chen: ${TEST_ADDRESSES.alice}`);
  console.log(`  Bob Martinez: ${TEST_ADDRESSES.bob}`);
  console.log(`  Carol Williams: ${TEST_ADDRESSES.carol}`);

  await closeDriver();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
