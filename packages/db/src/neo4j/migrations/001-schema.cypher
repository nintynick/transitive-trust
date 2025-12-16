// Transitive Trust Protocol - Neo4j Schema
// Version: 0.1.0

// ============ CONSTRAINTS ============

// Principal constraints
CREATE CONSTRAINT principal_id IF NOT EXISTS FOR (p:Principal) REQUIRE p.id IS UNIQUE;

// Subject constraints
CREATE CONSTRAINT subject_id IF NOT EXISTS FOR (s:Subject) REQUIRE s.id IS UNIQUE;

// Domain constraints
CREATE CONSTRAINT domain_id IF NOT EXISTS FOR (d:Domain) REQUIRE d.id IS UNIQUE;

// Endorsement constraints
CREATE CONSTRAINT endorsement_id IF NOT EXISTS FOR (e:Endorsement) REQUIRE e.id IS UNIQUE;

// ============ INDEXES ============

// Principal indexes
CREATE INDEX principal_type IF NOT EXISTS FOR (p:Principal) ON (p.type);
CREATE INDEX principal_publicKey IF NOT EXISTS FOR (p:Principal) ON (p.publicKey);
CREATE INDEX principal_createdAt IF NOT EXISTS FOR (p:Principal) ON (p.createdAt);

// Subject indexes
CREATE INDEX subject_type IF NOT EXISTS FOR (s:Subject) ON (s.type);
CREATE INDEX subject_canonicalName IF NOT EXISTS FOR (s:Subject) ON (s.canonicalName);
CREATE INDEX subject_createdAt IF NOT EXISTS FOR (s:Subject) ON (s.createdAt);

// Endorsement indexes
CREATE INDEX endorsement_createdAt IF NOT EXISTS FOR (e:Endorsement) ON (e.createdAt);
CREATE INDEX endorsement_verified IF NOT EXISTS FOR (e:Endorsement) ON (e.verified);
CREATE INDEX endorsement_ratingScore IF NOT EXISTS FOR (e:Endorsement) ON (e.ratingScore);

// ============ FULL-TEXT INDEXES ============

// Subject full-text search
CREATE FULLTEXT INDEX subject_search IF NOT EXISTS FOR (s:Subject) ON EACH [s.canonicalName, s.searchText];

// ============ GEOSPATIAL INDEXES ============

// Subject location (for geo queries)
CREATE POINT INDEX subject_location IF NOT EXISTS FOR (s:Subject) ON (s.location);
