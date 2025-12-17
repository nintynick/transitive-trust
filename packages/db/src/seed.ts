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
  // Main user - you can override with MAIN_USER_ADDRESS env var
  mainUser: '0x1234567890123456789012345678901234567890',
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

  // Main test user address - use env var if provided (your actual wallet address)
  const mainUserAddress = process.env.MAIN_USER_ADDRESS || TEST_ADDRESSES.mainUser;

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

  // Create or preserve main user
  if (mainUserExists) {
    console.log(`  Using existing main user: ${mainUserAddress}`);
    principals.push({ address: mainUserAddress, name: 'You (Test User)', bio: 'Main user' });
  } else {
    const mainUser = await createPrincipal({
      type: 'user',
      publicKey: mainUserAddress,
      metadata: {
        displayName: 'You (Test User)',
        name: 'Test User',
        bio: 'The main test account - this is you!',
      },
    });
    principals.push({ address: mainUser.id, name: 'You (Test User)', bio: 'Main user' });
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

  // Restaurants
  const restaurants = [
    { name: "Joe's Coffee Shop", type: 'business' as const, domains: ['food', 'local'] },
    { name: 'Sakura Sushi', type: 'business' as const, domains: ['food', 'local'] },
    { name: 'The Green Fork', type: 'business' as const, domains: ['food', 'local'] },
    { name: "Maria's Taqueria", type: 'business' as const, domains: ['food', 'local'] },
  ];

  for (const r of restaurants) {
    const s = await createSubject({
      type: r.type,
      canonicalName: r.name,
      domains: r.domains,
      location: { latitude: 37.7749 + (Math.random() - 0.5) * 0.1, longitude: -122.4194 + (Math.random() - 0.5) * 0.1 },
    });
    subjects.push({ id: s.id, name: r.name, type: r.type, domains: r.domains });
    console.log(`  Created: ${r.name}`);
  }

  // Services
  const services = [
    { name: "Mike's Plumbing", type: 'service' as const, domains: ['home', 'local'] },
    { name: 'QuickFix Auto Repair', type: 'service' as const, domains: ['auto', 'local'] },
    { name: 'Sparkle Clean Housekeeping', type: 'service' as const, domains: ['home', 'local'] },
  ];

  for (const svc of services) {
    const s = await createSubject({
      type: svc.type,
      canonicalName: svc.name,
      domains: svc.domains,
    });
    subjects.push({ id: s.id, name: svc.name, type: svc.type, domains: svc.domains });
    console.log(`  Created: ${svc.name}`);
  }

  // Products
  const products = [
    { name: 'TechPro Wireless Earbuds', type: 'product' as const, domains: ['tech', 'electronics'] },
    { name: 'EcoSmart Water Bottle', type: 'product' as const, domains: ['products', 'eco'] },
    { name: 'CloudComfort Mattress', type: 'product' as const, domains: ['products', 'home'] },
  ];

  for (const prod of products) {
    const s = await createSubject({
      type: prod.type,
      canonicalName: prod.name,
      domains: prod.domains,
    });
    subjects.push({ id: s.id, name: prod.name, type: prod.type, domains: prod.domains });
    console.log(`  Created: ${prod.name}`);
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

  // Main user -> Close friends (high trust)
  const mainUserEdges = [
    { to: 'Alice Chen', weight: 0.95, domain: '*' },
    { to: 'Bob Martinez', weight: 0.90, domain: '*' },
    { to: 'Carol Williams', weight: 0.85, domain: 'tech' },
    { to: 'David Lee', weight: 0.60, domain: '*' },
    { to: 'Eva Johnson', weight: 0.50, domain: '*' },
  ];

  for (const edge of mainUserEdges) {
    await createTrustEdge(
      findPrincipal('You (Test User)').address,
      {
        to: findPrincipal(edge.to).address,
        weight: edge.weight,
        domain: edge.domain,
      },
      testSignature
    );
    console.log(`  You -> ${edge.to} (${edge.weight}, ${edge.domain})`);
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

  // Joe's Coffee Shop - mixed reviews from different trust levels
  const joesReviews = [
    { author: 'Alice Chen', rating: 0.9, summary: 'Best latte in the city! The baristas really know their craft.', verified: true },
    { author: 'Frank Garcia', rating: 0.85, summary: 'Great atmosphere and excellent pastries. A bit pricey.', verified: true },
    { author: 'Bob Martinez', rating: 0.8, summary: 'Good coffee, friendly staff. My go-to morning spot.', verified: false },
    { author: 'Random Reviewer', rating: 0.3, summary: 'Terrible service, waited 20 minutes for a simple coffee.', verified: false },
  ];

  for (const review of joesReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject("Joe's Coffee Shop").id,
        domain: 'food',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'one-time' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Joe's Coffee (${review.rating})`);
  }

  // Sakura Sushi
  const sakuraReviews = [
    { author: 'Alice Chen', rating: 0.95, summary: 'Authentic Japanese cuisine. The omakase is incredible!', verified: true },
    { author: 'Iris Davis', rating: 0.88, summary: 'Fresh fish, great presentation. Definitely worth the price.', verified: true },
    { author: 'Kate Thompson', rating: 0.75, summary: 'Good sushi but the wait can be long on weekends.', verified: false },
  ];

  for (const review of sakuraReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('Sakura Sushi').id,
        domain: 'food',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Sakura Sushi (${review.rating})`);
  }

  // Mike's Plumbing
  const mikesReviews = [
    { author: 'Bob Martinez', rating: 0.92, summary: 'Fixed our emergency leak at 11pm. Honest pricing, great work!', verified: true },
    { author: 'Grace Kim', rating: 0.85, summary: 'Professional and punctual. Would hire again.', verified: true },
    { author: 'Jack Wilson', rating: 0.78, summary: 'Did a good job on bathroom renovation. Slightly over budget.', verified: true },
    { author: 'Suspicious Sam', rating: 0.95, summary: 'BEST PLUMBER EVER!!!!! 5 STARS!!!!!', verified: false },
  ];

  for (const review of mikesReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject("Mike's Plumbing").id,
        domain: 'home',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'one-time' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Mike's Plumbing (${review.rating})`);
  }

  // TechPro Wireless Earbuds
  const techProReviews = [
    { author: 'Carol Williams', rating: 0.88, summary: 'Excellent sound quality and battery life. Great for commuting.', verified: true },
    { author: 'Henry Brown', rating: 0.82, summary: 'Good value for money. ANC could be better.', verified: true },
    { author: 'Maya Patel', rating: 0.70, summary: 'Decent earbuds but the fit is not great for small ears.', verified: false },
    { author: 'Eva Johnson', rating: 0.75, summary: 'Works well for calls. Music quality is just okay.', verified: false },
  ];

  for (const review of techProReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('TechPro Wireless Earbuds').id,
        domain: 'tech',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'one-time' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> TechPro Earbuds (${review.rating})`);
  }

  // QuickFix Auto Repair
  const quickfixReviews = [
    { author: 'David Lee', rating: 0.85, summary: 'Honest mechanics. Fixed my brakes quickly and fairly priced.', verified: true },
    { author: 'Bob Martinez', rating: 0.90, summary: 'Been taking my car here for years. Trustworthy team.', verified: true },
    { author: 'Leo Anderson', rating: 0.72, summary: 'Good work but a bit slow. Had to wait 3 days for parts.', verified: false },
  ];

  for (const review of quickfixReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('QuickFix Auto Repair').id,
        domain: 'auto',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> QuickFix Auto (${review.rating})`);
  }

  // The Green Fork
  const greenForkReviews = [
    { author: 'Iris Davis', rating: 0.92, summary: 'Amazing vegan options! The cauliflower steak is a must-try.', verified: true },
    { author: 'Alice Chen', rating: 0.78, summary: 'Creative menu but portions are small for the price.', verified: true },
    { author: 'Random Reviewer', rating: 0.98, summary: 'Best restaurant I have ever been to in my entire life!', verified: false },
  ];

  for (const review of greenForkReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject('The Green Fork').id,
        domain: 'food',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'one-time' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> The Green Fork (${review.rating})`);
  }

  // Maria's Taqueria
  const mariasReviews = [
    { author: 'Frank Garcia', rating: 0.95, summary: 'Authentic Mexican food! Reminds me of my grandmother\'s cooking.', verified: true },
    { author: 'Jack Wilson', rating: 0.88, summary: 'Best tacos in town. The salsa verde is incredible.', verified: true },
    { author: 'Bob Martinez', rating: 0.82, summary: 'Great value lunch specials. Gets crowded at noon.', verified: false },
  ];

  for (const review of mariasReviews) {
    await createEndorsement(
      findPrincipal(review.author).address,
      {
        subject: findSubject("Maria's Taqueria").id,
        domain: 'food',
        rating: { score: review.rating, originalScore: `${Math.round(review.rating * 5)} out of 5`, originalScale: '1-5 stars' },
        content: { summary: review.summary },
        context: { verified: review.verified, relationship: 'recurring' },
      },
      testSignature
    );
    console.log(`  ${review.author} -> Maria's Taqueria (${review.rating})`);
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

  console.log('Main test user address:', mainUserAddress);
  console.log('\nTo test with your own wallet:');
  console.log('1. Connect your MetaMask wallet to the app');
  console.log('2. Your wallet address becomes your principal ID');
  console.log('3. The seed data uses test addresses - to see personalized');
  console.log('   scores, you would need to trust some of these test users');
  console.log('\nTest addresses you can trust:');
  console.log(`  Alice Chen: ${TEST_ADDRESSES.alice}`);
  console.log(`  Bob Martinez: ${TEST_ADDRESSES.bob}`);
  console.log(`  Carol Williams: ${TEST_ADDRESSES.carol}`);

  await closeDriver();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
