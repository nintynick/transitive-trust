# Transitive Trust Protocol (TTP)

**Version:** 0.1.0-draft  
**Status:** Draft Specification  
**Date:** December 2024

---

## Abstract

The Transitive Trust Protocol (TTP) defines a decentralized system for reputation and endorsement that leverages social graph topology to provide *perspectival* trust scores. Unlike global reputation systems (Yelp, Google Reviews), TTP computes trust relative to an individual viewer's network, answering the question: "How much should *I* trust this entity, given the opinions of people *I* trust?"

This specification defines the data model, trust propagation semantics, query interface, and privacy considerations for implementing TTP-compliant systems.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Design Principles](#3-design-principles)
4. [Data Model](#4-data-model)
5. [Trust Graph Semantics](#5-trust-graph-semantics)
6. [Trust Propagation Algorithm](#6-trust-propagation-algorithm)
7. [Endorsement System](#7-endorsement-system)
8. [Query Interface](#8-query-interface)
9. [Privacy Model](#9-privacy-model)
10. [Sybil Resistance](#10-sybil-resistance)
11. [Federation](#11-federation)
12. [Wire Format](#12-wire-format)
13. [Security Considerations](#13-security-considerations)
14. [Appendix A: Reference Implementation Notes](#appendix-a-reference-implementation-notes)
15. [Appendix B: Example Scenarios](#appendix-b-example-scenarios)

---

## 1. Introduction

### 1.1 Problem Statement

Existing reputation systems suffer from several fundamental limitations:

1. **Context collapse**: A 4.5-star rating aggregates opinions from strangers whose values, standards, and contexts may differ wildly from the viewer's.

2. **Manipulation vulnerability**: Global ratings incentivize fake reviews, review bombing, and reputation laundering.

3. **Cold start asymmetry**: New but excellent providers are invisible; established but declining providers retain legacy ratings.

4. **Trust homogeneity**: Systems assume all reviewers are equally credible to all viewers.

### 1.2 Solution Overview

TTP addresses these limitations by:

- Making trust **relational**: scores are always computed relative to a specific viewer
- Making trust **transitive**: if A trusts B, and B trusts C, then A has indirect trust in C (with decay)
- Making trust **domain-scoped**: trust can vary by category (Alice trusts Bob for restaurants, but not for car repair)
- Making endorsements **attributable**: viewers see not just scores but *who* in their network vouches for something

### 1.3 Scope

This specification covers:
- Core data structures and their semantics
- Trust computation algorithms
- Query interface for retrieving personalized rankings
- Privacy and access control model
- Sybil resistance mechanisms

This specification does NOT cover:
- User interface requirements
- Specific domain taxonomies
- Payment or incentive mechanisms
- Content moderation policies

---

## 2. Terminology

| Term | Definition |
|------|------------|
| **Principal** | Any entity that can hold trust relationships: users, organizations, or automated agents |
| **Subject** | Any entity that can receive endorsements: businesses, services, individuals, products |
| **Trust Edge** | A directed, weighted relationship from one principal to another indicating confidence in their judgment |
| **Endorsement** | A principal's evaluation of a subject within a specific domain |
| **Domain** | A category or context for trust and endorsements (e.g., "restaurants", "plumbing", "software-engineering") |
| **Trust Path** | A sequence of trust edges connecting two principals |
| **Effective Trust** | The computed trust weight between two principals, accounting for all paths and decay |
| **Viewer** | The principal from whose perspective a query is executed |
| **Network** | The set of principals reachable from a viewer via trust edges within a maximum hop distance |

### 2.1 Requirement Level Keywords

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 3. Design Principles

### 3.1 Perspectival by Default

All trust computations MUST be relative to a specific viewer. There is no concept of "global" trust in TTP; even aggregate statistics are computed as averages over viewer populations, not as viewer-independent values.

### 3.2 Explicit Over Implicit

Trust edges SHOULD be explicitly declared by principals rather than inferred from behavior. Implementations MAY support implicit trust inference as a supplementary signal but MUST clearly distinguish inferred edges from explicit declarations.

### 3.3 Decay Over Distance

Trust MUST decay as it propagates through the graph. First-hand trust (direct edge) is always weighted more heavily than second-hand trust (two hops), and so on.

### 3.4 Domain Specificity

Trust and endorsements SHOULD be scoped to domains. A principal's expertise in one domain does not automatically transfer to others.

### 3.5 Transparency

Viewers SHOULD be able to inspect why they received a particular trust score, including which paths contributed and with what weights.

### 3.6 Principal Sovereignty

Principals MUST have full control over their own trust declarations and endorsements. No mechanism should allow one principal to modify another's declarations.

---

## 4. Data Model

### 4.1 Principal

```
Principal {
  id: PrincipalId           // Globally unique identifier
  type: PrincipalType       // "user" | "organization" | "agent"
  public_key: PublicKey     // For signature verification
  created_at: Timestamp
  metadata: Map<String, String>  // Display name, avatar, etc.
}
```

**PrincipalId** MUST be a globally unique identifier. Implementations MAY use:
- UUID v4
- DID (Decentralized Identifier)
- Public key hash
- Domain-namespaced identifiers (e.g., `user:alice@example.com`)

### 4.2 Subject

```
Subject {
  id: SubjectId             // Globally unique identifier
  type: SubjectType         // "business" | "individual" | "product" | "service"
  canonical_name: String
  domains: Set<DomainId>    // Applicable domains
  location: GeoLocation?    // Optional geographic anchor
  external_ids: Map<String, String>  // Links to external systems
  created_at: Timestamp
  metadata: Map<String, String>
}
```

Subjects MAY also be Principals (e.g., a freelancer is both a user who can trust others and a service provider who can be endorsed).

### 4.3 Domain

```
Domain {
  id: DomainId              // e.g., "restaurants", "plumbing.residential"
  parent: DomainId?         // For hierarchical domains
  name: String
  description: String
}
```

Domains form a hierarchy. Trust declared for a parent domain SHOULD propagate to child domains (with optional decay). Trust declared for a child domain SHOULD NOT automatically propagate to parent or sibling domains.

**Reserved Domains:**
- `*` (wildcard): Global trust across all domains
- `meta.trust`: Trust in someone's ability to evaluate trustworthiness itself

### 4.4 Trust Edge

```
TrustEdge {
  id: EdgeId
  from: PrincipalId         // The trustor
  to: PrincipalId           // The trustee
  weight: TrustWeight       // 0.0 to 1.0
  domain: DomainId          // Scope of trust ("*" for global)
  created_at: Timestamp
  expires_at: Timestamp?    // Optional expiration
  evidence: Evidence?       // Optional justification
  signature: Signature      // Signed by `from` principal
}

TrustWeight: Float in range [0.0, 1.0]
  0.0  = No trust (explicit distrust is handled separately)
  0.5  = Neutral/unknown
  1.0  = Complete trust
```

**Semantics:**
- A trust edge represents: "I (from) trust (to)'s judgment in (domain) with confidence (weight)"
- Edges are directed: A trusting B does not imply B trusts A
- Multiple edges between the same principals in different domains are permitted
- Edges MUST be signed by the `from` principal to prevent spoofing

### 4.5 Distrust Edge

```
DistrustEdge {
  id: EdgeId
  from: PrincipalId
  to: PrincipalId
  domain: DomainId
  created_at: Timestamp
  reason: DistrustReason    // "spam" | "malicious" | "incompetent" | "conflict_of_interest" | "other"
  signature: Signature
}
```

Distrust is modeled separately from trust (not as weight=0) because:
- Absence of trust ≠ presence of distrust
- Distrust may warrant blocking path propagation entirely
- Distrust reasons enable different handling (spam vs. honest disagreement)

**Distrust Propagation:**
- Distrust SHOULD NOT propagate transitively by default (A distrusts B does not mean A distrusts everyone B trusts)
- Implementations MAY offer "cautious mode" where distrust creates a penalty on downstream paths

### 4.6 Endorsement

```
Endorsement {
  id: EndorsementId
  author: PrincipalId
  subject: SubjectId
  domain: DomainId
  rating: Rating
  content: EndorsementContent?
  created_at: Timestamp
  updated_at: Timestamp
  context: EndorsementContext?
  signature: Signature
}

Rating {
  score: Float              // 0.0 to 1.0 normalized
  original_score: Any       // Original scale (e.g., "4 out of 5 stars")
  original_scale: String    // Description of original scale
}

EndorsementContent {
  summary: String           // Brief endorsement (< 280 chars)
  body: String?             // Extended review
  media: [MediaReference]?  // Photos, videos, etc.
  tags: [String]?           // Freeform tags
}

EndorsementContext {
  transaction_date: Date?   // When the service was rendered
  transaction_id: String?   // Reference to external transaction
  relationship: String?     // "one-time" | "recurring" | "long-term"
  verified: Boolean         // Whether transaction was verified
}
```

**Endorsement Integrity:**
- Endorsements MUST be signed by the author
- Endorsements MAY be updated; implementations MUST preserve history
- Implementations SHOULD support verification linking endorsements to actual transactions

---

## 5. Trust Graph Semantics

### 5.1 Graph Structure

The trust graph G = (V, E) where:
- V = set of all Principals
- E = set of all TrustEdges

The graph is:
- **Directed**: trust is not symmetric
- **Weighted**: edges carry trust weights
- **Multigraph**: multiple edges between nodes (different domains) are permitted
- **Sparse**: most principal pairs have no direct edge

### 5.2 Path Semantics

A **trust path** from principal A to principal B is a sequence of edges:

```
A → P₁ → P₂ → ... → Pₙ → B
```

The **path trust** is computed as the product of edge weights:

```
pathTrust(A → P₁ → ... → B) = w(A,P₁) × w(P₁,P₂) × ... × w(Pₙ,B) × decay(n+1)
```

Where `decay(hops)` is a monotonically decreasing function.

### 5.3 Decay Functions

Implementations MUST support at least one decay function. RECOMMENDED options:

**Exponential Decay (default):**
```
decay(hops) = λ^(hops-1)
```
Where λ ∈ (0, 1) is the decay factor. Suggested default: λ = 0.7

**Linear Decay:**
```
decay(hops) = max(0, 1 - (hops-1) × δ)
```
Where δ is the per-hop reduction. Suggested default: δ = 0.25

**Hard Cutoff:**
```
decay(hops) = 1 if hops ≤ maxHops else 0
```
Suggested default: maxHops = 4

### 5.4 Multi-Path Aggregation

When multiple paths exist between two principals, implementations MUST aggregate them. Supported strategies:

**Maximum (default):**
```
effectiveTrust(A, B) = max(pathTrust(p) for p in paths(A, B))
```
Rationale: The strongest connection dominates.

**Probabilistic Union:**
```
effectiveTrust(A, B) = 1 - ∏(1 - pathTrust(p)) for p in paths(A, B)
```
Rationale: Multiple independent paths increase confidence.

**Weighted Sum (capped):**
```
effectiveTrust(A, B) = min(1.0, Σ pathTrust(p) for p in paths(A, B))
```
Rationale: Paths accumulate but saturate at 1.0.

### 5.5 Domain Resolution

When computing trust for a specific domain:

1. Look for edges matching the exact domain
2. If not found, traverse parent domains up to `*`
3. Apply domain distance decay for non-exact matches

```
domainWeight(declared, queried) =
  1.0                           if declared == queried
  0.9^depth                     if declared is ancestor of queried
  0.0                           if no hierarchical relationship
```

---

## 6. Trust Propagation Algorithm

### 6.1 Core Algorithm: Bounded BFS with Aggregation

```
function computeEffectiveTrust(viewer, target, domain, config):
  if viewer == target:
    return 1.0
  
  maxHops = config.maxHops ?? 4
  decayFn = config.decayFunction ?? exponentialDecay(0.7)
  aggregation = config.aggregation ?? "maximum"
  
  // Track best trust to each node and the paths that achieved it
  visited = Map<PrincipalId, {trust: Float, paths: [Path]}>()
  visited[viewer] = {trust: 1.0, paths: [[viewer]]}
  
  // BFS queue: (node, current_trust, hops, path)
  queue = [(viewer, 1.0, 0, [viewer])]
  
  while queue is not empty:
    (current, currentTrust, hops, path) = queue.dequeue()
    
    if hops >= maxHops:
      continue
    
    for edge in outgoingEdges(current, domain):
      if isDistrusted(viewer, edge.to, domain):
        continue  // Skip distrusted nodes
      
      edgeTrust = edge.weight × domainWeight(edge.domain, domain)
      pathTrust = currentTrust × edgeTrust × decayFn(hops + 1)
      
      if pathTrust < config.minThreshold:
        continue  // Prune negligible paths
      
      newPath = path + [edge.to]
      
      if edge.to not in visited or shouldUpdate(visited[edge.to], pathTrust, aggregation):
        updateVisited(visited, edge.to, pathTrust, newPath, aggregation)
        queue.enqueue((edge.to, pathTrust, hops + 1, newPath))
  
  if target in visited:
    return {
      trust: visited[target].trust,
      paths: visited[target].paths,
      hops: minPathLength(visited[target].paths) - 1
    }
  else:
    return {trust: 0.0, paths: [], hops: -1}
```

### 6.2 Optimized Algorithm: Personalized PageRank

For large-scale deployments, Personalized PageRank (PPR) provides efficient approximation:

```
function computeTrustViaPPR(viewer, domain, config):
  α = config.restartProbability ?? 0.15  // Teleport back to viewer
  ε = config.convergenceThreshold ?? 1e-6
  maxIterations = config.maxIterations ?? 100
  
  // Initialize: all probability mass on viewer
  scores = Map<PrincipalId, Float>()
  scores[viewer] = 1.0
  
  for i in 1..maxIterations:
    newScores = Map<PrincipalId, Float>()
    
    for (node, score) in scores:
      // Teleport component
      newScores[viewer] += α × score
      
      // Propagation component
      edges = outgoingEdges(node, domain)
      totalWeight = sum(e.weight for e in edges)
      
      if totalWeight > 0:
        for edge in edges:
          contribution = (1 - α) × score × (edge.weight / totalWeight)
          newScores[edge.to] += contribution
    
    if hasConverged(scores, newScores, ε):
      break
    
    scores = newScores
  
  return scores  // Maps each reachable principal to their PPR trust score
```

### 6.3 Precomputation Strategy

For frequently-querying viewers, implementations SHOULD precompute and cache trust neighborhoods:

```
TrustNeighborhood {
  viewer: PrincipalId
  domain: DomainId
  computed_at: Timestamp
  ttl: Duration
  entries: Map<PrincipalId, {trust: Float, hop_distance: Int}>
}
```

Cache invalidation SHOULD occur when:
- Any edge in the viewer's N-hop neighborhood changes
- TTL expires
- Viewer explicitly requests refresh

---

## 7. Endorsement System

### 7.1 Creating Endorsements

Principals create endorsements by signing endorsement records:

```
function createEndorsement(author, subject, domain, rating, content):
  endorsement = Endorsement {
    id: generateId(),
    author: author.id,
    subject: subject.id,
    domain: domain,
    rating: normalizeRating(rating),
    content: content,
    created_at: now(),
    updated_at: now(),
    context: null,
    signature: null
  }
  
  endorsement.signature = sign(author.privateKey, canonicalize(endorsement))
  
  return endorsement
```

### 7.2 Verified Endorsements

Endorsements MAY be linked to verified transactions:

```
VerificationProof {
  endorsement_id: EndorsementId
  transaction_hash: Hash          // Hash of transaction record
  verifier: PrincipalId           // Third party that verified
  verified_at: Timestamp
  verification_method: String     // "payment_processor" | "booking_system" | "manual"
  signature: Signature            // Verifier's signature
}
```

Verified endorsements SHOULD receive higher weight in aggregation.

### 7.3 Endorsement Aggregation

To compute a viewer's personalized score for a subject:

```
function computePersonalizedScore(viewer, subject, domain, config):
  endorsements = getEndorsements(subject, domain)
  
  if endorsements is empty:
    return {score: null, confidence: 0, contributors: []}
  
  weightedSum = 0.0
  totalWeight = 0.0
  contributors = []
  
  for endorsement in endorsements:
    trustResult = computeEffectiveTrust(viewer, endorsement.author, domain, config)
    
    if trustResult.trust < config.minTrustThreshold:
      continue
    
    weight = trustResult.trust
    if endorsement.context?.verified:
      weight *= config.verificationBoost ?? 1.5
    
    // Apply recency decay
    age = now() - endorsement.created_at
    recencyWeight = config.recencyDecay(age)
    weight *= recencyWeight
    
    weightedSum += weight × endorsement.rating.score
    totalWeight += weight
    
    contributors.append({
      principal: endorsement.author,
      trust: trustResult.trust,
      rating: endorsement.rating.score,
      paths: trustResult.paths
    })
  
  if totalWeight == 0:
    return {score: null, confidence: 0, contributors: []}
  
  return {
    score: weightedSum / totalWeight,
    confidence: computeConfidence(totalWeight, len(contributors)),
    contributors: contributors
  }
```

### 7.4 Confidence Scoring

Confidence reflects how reliable the personalized score is:

```
function computeConfidence(totalWeight, numContributors):
  // More contributors and higher total weight = more confidence
  contributorFactor = 1 - e^(-numContributors / 3)
  weightFactor = 1 - e^(-totalWeight / 2)
  
  return (contributorFactor + weightFactor) / 2
```

---

## 8. Query Interface

### 8.1 Core Queries

#### 8.1.1 Get Personalized Score

```
Query: GetPersonalizedScore
Input:
  viewer: PrincipalId
  subject: SubjectId
  domain: DomainId
  options: QueryOptions?
  
Output:
  score: Float?               // null if no data
  confidence: Float           // 0.0 to 1.0
  endorsement_count: Int      // Total endorsements considered
  network_endorsement_count: Int  // Endorsements from viewer's network
  top_contributors: [Contributor]  // Most influential endorsers
  explanation: Explanation?   // If options.explain = true
```

#### 8.1.2 Search Subjects

```
Query: SearchSubjects
Input:
  viewer: PrincipalId
  domain: DomainId
  filters: SearchFilters
  sort: SortOptions
  pagination: PaginationOptions
  
SearchFilters:
  query: String?              // Text search
  location: GeoFilter?        // Geographic constraint
  min_score: Float?           // Minimum personalized score
  min_confidence: Float?      // Minimum confidence
  min_network_endorsements: Int?  // Require network coverage
  
SortOptions:
  field: "score" | "confidence" | "distance" | "recency"
  order: "asc" | "desc"
  
Output:
  results: [SearchResult]
  total_count: Int
  facets: Map<String, [FacetValue]>?
```

#### 8.1.3 Get Trust Network

```
Query: GetTrustNetwork
Input:
  viewer: PrincipalId
  domain: DomainId?           // null for all domains
  max_hops: Int?
  min_trust: Float?
  
Output:
  nodes: [NetworkNode]
  edges: [NetworkEdge]
  stats: NetworkStats
  
NetworkNode:
  principal: Principal
  effective_trust: Float
  hop_distance: Int
  
NetworkEdge:
  from: PrincipalId
  to: PrincipalId
  weight: Float
  domain: DomainId
```

#### 8.1.4 Get Endorsement Feed

```
Query: GetEndorsementFeed
Input:
  viewer: PrincipalId
  domain: DomainId?
  filters: FeedFilters
  pagination: PaginationOptions
  
FeedFilters:
  min_author_trust: Float?
  subjects: [SubjectId]?
  authors: [PrincipalId]?
  since: Timestamp?
  
Output:
  endorsements: [EndorsementWithContext]
  
EndorsementWithContext:
  endorsement: Endorsement
  author_trust: Float
  trust_path: [PrincipalId]
  subject: Subject
```

### 8.2 Write Operations

#### 8.2.1 Declare Trust

```
Mutation: DeclareTrust
Input:
  from: PrincipalId           // Must match authenticated principal
  to: PrincipalId
  weight: Float
  domain: DomainId
  evidence: Evidence?
  expires_at: Timestamp?
  
Output:
  edge: TrustEdge
  
Errors:
  - SELF_TRUST_NOT_ALLOWED
  - INVALID_WEIGHT
  - INVALID_DOMAIN
  - SIGNATURE_VERIFICATION_FAILED
```

#### 8.2.2 Revoke Trust

```
Mutation: RevokeTrust
Input:
  edge_id: EdgeId
  
Output:
  revoked: Boolean
```

#### 8.2.3 Create Endorsement

```
Mutation: CreateEndorsement
Input:
  author: PrincipalId
  subject: SubjectId
  domain: DomainId
  rating: RatingInput
  content: ContentInput?
  context: ContextInput?
  
Output:
  endorsement: Endorsement
```

#### 8.2.4 Update Endorsement

```
Mutation: UpdateEndorsement
Input:
  endorsement_id: EndorsementId
  rating: RatingInput?
  content: ContentInput?
  
Output:
  endorsement: Endorsement
  previous_version: Endorsement
```

### 8.3 Query Options

```
QueryOptions {
  max_hops: Int               // Default: 4
  decay_function: "exponential" | "linear" | "hard_cutoff"
  decay_parameter: Float      // Function-specific parameter
  aggregation: "maximum" | "probabilistic" | "sum"
  min_trust_threshold: Float  // Ignore endorsers below this trust
  include_explanation: Boolean
  include_paths: Boolean
  verification_boost: Float   // Multiplier for verified endorsements
  recency_half_life: Duration // For time-based decay of endorsements
}
```

---

## 9. Privacy Model

### 9.1 Visibility Levels

Each data element has a visibility level:

```
Visibility:
  PUBLIC        // Visible to anyone
  NETWORK       // Visible to principals in trust network
  MUTUAL        // Visible only if mutual trust exists
  PRIVATE       // Visible only to owner
```

### 9.2 Default Visibility

| Data Type | Default Visibility |
|-----------|-------------------|
| Principal existence | PUBLIC |
| Principal metadata | PUBLIC |
| Trust edge existence | NETWORK |
| Trust edge weight | MUTUAL |
| Endorsement existence | PUBLIC |
| Endorsement content | PUBLIC |
| Trust network structure | PRIVATE |

### 9.3 Privacy-Preserving Queries

Implementations SHOULD support privacy-preserving query modes:

**Anonymous Queries:**
- Viewer identity not revealed to subject or endorsers
- Server computes personalized score without logging viewer

**Aggregate-Only Responses:**
- Return scores without revealing individual contributors
- Useful when endorsers don't want to be identified

**Zero-Knowledge Proofs (optional):**
- Prove "someone in your network at distance ≤ 3 endorsed this with rating ≥ 4" without revealing who

### 9.4 Data Minimization

Implementations MUST:
- Not retain query logs beyond operational necessity
- Allow principals to export their data
- Allow principals to delete their data (with cascade options for trust edges)
- Implement right-to-be-forgotten for subjects

---

## 10. Sybil Resistance

### 10.1 Threat Model

Attackers may attempt to:
1. Create fake principals to self-endorse
2. Create fake trust rings to amplify influence
3. Build trust slowly then defect (long con)
4. Compromise legitimate accounts to inject trust

### 10.2 Prevention Mechanisms

#### 10.2.1 Trust Edge Costs

Creating trust edges SHOULD require some cost:

```
TrustEdgeCost {
  type: "mutual_confirmation" | "stake" | "rate_limit" | "verification"
  parameters: Map<String, Any>
}
```

**Mutual Confirmation:** Both parties must confirm the edge (for bidirectional contexts)

**Stake:** Trust edges require locking tokens/reputation that can be slashed

**Rate Limit:** Principals can only create N new edges per time period

**Verification:** New principals require identity verification before trusting others

#### 10.2.2 Trust Decay Over Inactivity

Trust edges SHOULD decay if not reinforced:

```
function activeWeight(edge, config):
  baseWeight = edge.weight
  lastActivity = max(edge.created_at, edge.last_reinforced)
  age = now() - lastActivity
  
  if age > config.inactivityThreshold:
    decayFactor = config.inactivityDecay ^ ((age - config.inactivityThreshold) / config.decayPeriod)
    return baseWeight × decayFactor
  
  return baseWeight
```

#### 10.2.3 Graph Analysis

Implementations SHOULD detect suspicious patterns:

```
SybilIndicators {
  cluster_coefficient: Float    // Unusually tight clusters
  trust_reciprocity: Float      // Too many mutual edges
  edge_creation_velocity: Float // Rapid trust accumulation
  path_diversity: Float         // Single paths vs. multiple independent paths
  account_age: Duration         // New accounts are riskier
}

function computeSybilRisk(principal):
  indicators = computeIndicators(principal)
  return weightedScore(indicators, sybilWeights)
```

High-risk principals MAY have their endorsements downweighted or flagged.

#### 10.2.4 Vouching Penalties

If a principal vouches for someone who turns out to be malicious:

```
function applyVouchingPenalty(voucher, maliciousPrincipal, severity):
  edge = getEdge(voucher, maliciousPrincipal)
  
  // Reduce voucher's outgoing trust weight on all edges
  penalty = severity × edge.weight × config.vouchingPenaltyFactor
  
  for edge in outgoingEdges(voucher):
    edge.penaltyFactor = max(0, 1 - penalty)
```

This creates incentives to vouch carefully.

---

## 11. Federation

### 11.1 Multi-Instance Architecture

TTP supports federation across multiple instances:

```
Instance {
  id: InstanceId
  base_url: URL
  public_key: PublicKey
  supported_domains: [DomainId]
  federation_policy: FederationPolicy
}

FederationPolicy {
  accepts_remote_principals: Boolean
  accepts_remote_endorsements: Boolean
  trust_bridge_mode: "none" | "explicit" | "automatic"
}
```

### 11.2 Cross-Instance Trust

Principals on different instances can establish trust via:

**Explicit Bridging:**
Principal creates a trust edge specifying remote principal's full identifier:

```
TrustEdge {
  from: "local:alice"
  to: "remote.instance.com:bob"
  ...
}
```

**Instance-Level Trust:**
Instances can establish trust relationships, implying baseline trust for all principals:

```
InstanceTrust {
  from_instance: InstanceId
  to_instance: InstanceId
  baseline_trust: Float         // Applied to all cross-instance edges
  domain_restrictions: [DomainId]?
}
```

### 11.3 Endorsement Portability

Endorsements SHOULD be portable across instances:

- Endorsements are self-contained signed documents
- Any instance can verify and index endorsements from other instances
- Subject identity resolution uses external_ids for cross-referencing

---

## 12. Wire Format

### 12.1 Serialization

All data structures MUST support JSON serialization. Implementations SHOULD also support:
- CBOR (for compact binary)
- Protocol Buffers (for strict schemas)

### 12.2 Signatures

Signatures use Ed25519 by default:

```
Signature {
  algorithm: "ed25519" | "secp256k1"
  public_key: Base64String
  signature: Base64String
  signed_at: Timestamp
}
```

Canonicalization for signing:
1. Remove `signature` field
2. Sort object keys alphabetically
3. Serialize as JSON with no whitespace
4. UTF-8 encode
5. Sign resulting bytes

### 12.3 API Transport

Implementations SHOULD expose:
- REST/JSON API for simple queries
- GraphQL for complex queries with field selection
- WebSocket for real-time updates

### 12.4 Example Payloads

**Trust Edge (JSON):**
```json
{
  "id": "edge_01HQ3K5X7Y2N4M8P6R9T0V1W3",
  "from": "user_alice_abc123",
  "to": "user_bob_def456", 
  "weight": 0.85,
  "domain": "restaurants",
  "created_at": "2024-12-15T10:30:00Z",
  "expires_at": null,
  "evidence": {
    "type": "personal_knowledge",
    "note": "Worked together for 3 years, great taste in food"
  },
  "signature": {
    "algorithm": "ed25519",
    "public_key": "MCowBQYDK2VwAyEA...",
    "signature": "5G8x9Y2n4M8p6R9t0V1w3...",
    "signed_at": "2024-12-15T10:30:00Z"
  }
}
```

**Endorsement (JSON):**
```json
{
  "id": "end_01HQ3K5X7Y2N4M8P6R9T0V1W3",
  "author": "user_alice_abc123",
  "subject": "biz_joes_plumbing_789",
  "domain": "plumbing.residential",
  "rating": {
    "score": 0.9,
    "original_score": "5",
    "original_scale": "1-5 stars"
  },
  "content": {
    "summary": "Fixed our leak quickly and fairly priced",
    "body": "Joe came out same day, diagnosed the problem in 10 minutes...",
    "tags": ["responsive", "fair-pricing", "professional"]
  },
  "created_at": "2024-12-10T14:22:00Z",
  "updated_at": "2024-12-10T14:22:00Z",
  "context": {
    "transaction_date": "2024-12-09",
    "relationship": "one-time",
    "verified": true
  },
  "signature": {
    "algorithm": "ed25519",
    "public_key": "MCowBQYDK2VwAyEA...",
    "signature": "7K2m5N8q1R4t7W0y3...",
    "signed_at": "2024-12-10T14:22:00Z"
  }
}
```

**Query Response (JSON):**
```json
{
  "query": "GetPersonalizedScore",
  "result": {
    "score": 0.847,
    "confidence": 0.72,
    "endorsement_count": 23,
    "network_endorsement_count": 4,
    "top_contributors": [
      {
        "principal": {
          "id": "user_carol_xyz789",
          "display_name": "Carol M."
        },
        "trust": 0.85,
        "rating": 0.9,
        "hop_distance": 1,
        "verified": true
      },
      {
        "principal": {
          "id": "user_dave_uvw012",
          "display_name": "Dave K."
        },
        "trust": 0.595,
        "rating": 0.8,
        "hop_distance": 2,
        "verified": false
      }
    ],
    "explanation": {
      "summary": "Score based on 4 endorsements from your network",
      "primary_path": ["you", "Carol M.", "subject"],
      "network_coverage": "sparse"
    }
  }
}
```

---

## 13. Security Considerations

### 13.1 Authentication

All write operations MUST be authenticated. Supported methods:
- Signature-based (principal signs request with private key)
- OAuth 2.0 / OpenID Connect (for hosted implementations)
- DID-based authentication

### 13.2 Authorization

Principals can only:
- Create/modify/delete their own trust edges
- Create/modify/delete their own endorsements
- Query data within visibility constraints

### 13.3 Integrity

- All trust edges and endorsements MUST be signed
- Implementations MUST verify signatures before accepting data
- Historical data SHOULD be preserved for audit

### 13.4 Availability

Implementations SHOULD:
- Rate limit queries to prevent DoS
- Cache computed trust scores
- Support read replicas for query scaling

### 13.5 Confidentiality

- Trust graph topology can reveal sensitive relationships
- Implementations MUST enforce visibility rules
- Consider encrypted storage for sensitive edges

### 13.6 Attack Vectors

| Attack | Mitigation |
|--------|------------|
| Sybil (fake accounts) | See Section 10 |
| Trust injection | Signature verification |
| Eclipse (isolate a principal) | Multiple independent paths |
| Reputation laundering | Historical analysis, vouching penalties |
| Timing attacks on queries | Constant-time operations, caching |
| Graph structure inference | Differential privacy, aggregate queries |

---

## Appendix A: Reference Implementation Notes

### A.1 Recommended Tech Stack

**Graph Storage:**
- Neo4j, Amazon Neptune, or TigerGraph for native graph operations
- PostgreSQL with recursive CTEs for simpler deployments
- Redis for caching trust neighborhoods

**Signature Verification:**
- libsodium for Ed25519

**Search:**
- Elasticsearch or Meilisearch for subject search
- PostGIS for geographic queries

### A.2 Performance Targets

| Operation | Target Latency (p99) |
|-----------|---------------------|
| Get personalized score (cached) | < 50ms |
| Get personalized score (computed) | < 500ms |
| Search subjects | < 200ms |
| Create trust edge | < 100ms |
| Create endorsement | < 100ms |

### A.3 Scaling Considerations

- Trust computation is O(branching_factor^max_hops) worst case
- Precompute neighborhoods for active users
- Shard by geography for location-based queries
- Use approximate algorithms (PPR) at scale

---

## Appendix B: Example Scenarios

### B.1 Finding a Plumber

Alice needs a plumber. She queries:

```
SearchSubjects(
  viewer: alice,
  domain: "plumbing.residential",
  filters: {
    location: {near: alice.location, radius: "20km"},
    min_confidence: 0.3
  },
  sort: {field: "score", order: "desc"}
)
```

Results show Joe's Plumbing with score 0.85 and confidence 0.72. Alice inspects the explanation:

- Her friend Carol (trust: 0.85) gave 5 stars (verified transaction)
- Her colleague Dave (trust: 0.60, via Bob) gave 4 stars
- 19 other endorsements exist but from outside her network

Alice trusts the recommendation because Carol has great judgment on home services.

### B.2 Building Trust in a New City

Bob moves to a new city where he knows no one. His trust network is empty locally.

Options:
1. **Import contacts:** Connect existing contacts who may know people in the new city (2-hop discovery)
2. **Domain seeding:** Trust local experts in specific domains (food blogger, neighborhood Facebook group admin)
3. **Gradual building:** Start with low-weight trust edges, increase as experiences confirm judgment
4. **Fallback:** Use global scores with low confidence until network develops

### B.3 Detecting a Sybil Attack

A malicious actor creates 50 fake accounts that all trust each other and endorse their restaurant.

Detection:
- Cluster coefficient for these accounts is ~1.0 (everyone trusts everyone)
- All accounts created within 48 hours
- No inbound trust from established principals
- Endorsements lack verified transactions

Response:
- Flag accounts for review
- Downweight or exclude from aggregations
- Alert principals who trusted any flagged account

### B.4 Cross-Domain Trust

Alice trusts Carol for restaurants (0.9) but hasn't declared trust for auto mechanics.

When Alice searches for mechanics:
- Carol's mechanic endorsement is included
- But weighted at 0.9 × 0.9 (domain distance decay) = 0.81
- UI indicates "Carol rated this, but you haven't confirmed her judgment in auto mechanics"

Alice can then explicitly set her trust in Carol for auto mechanics.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0-draft | 2024-12 | Initial draft specification |

---

## Authors

[To be filled]

## License

This specification is released under Creative Commons Attribution 4.0 International (CC BY 4.0).
