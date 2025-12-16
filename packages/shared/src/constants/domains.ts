/**
 * Reserved and common domain definitions
 * Spec Section 4.3
 */

export const RESERVED_DOMAINS = {
  /** Wildcard: Global trust across all domains */
  WILDCARD: '*',
  /** Meta trust: Trust in someone's ability to evaluate trustworthiness itself */
  META_TRUST: 'meta.trust',
} as const;

/**
 * Common domain hierarchy examples
 * These can be customized per deployment
 */
export const COMMON_DOMAINS = {
  // Services
  'services': { name: 'Services', parent: undefined },
  'services.home': { name: 'Home Services', parent: 'services' },
  'services.home.plumbing': { name: 'Plumbing', parent: 'services.home' },
  'services.home.electrical': { name: 'Electrical', parent: 'services.home' },
  'services.home.cleaning': { name: 'Cleaning', parent: 'services.home' },
  'services.automotive': { name: 'Automotive', parent: 'services' },
  'services.automotive.repair': { name: 'Auto Repair', parent: 'services.automotive' },
  'services.professional': { name: 'Professional Services', parent: 'services' },
  'services.professional.legal': { name: 'Legal', parent: 'services.professional' },
  'services.professional.accounting': { name: 'Accounting', parent: 'services.professional' },

  // Food & Dining
  'food': { name: 'Food & Dining', parent: undefined },
  'food.restaurants': { name: 'Restaurants', parent: 'food' },
  'food.restaurants.fine-dining': { name: 'Fine Dining', parent: 'food.restaurants' },
  'food.restaurants.casual': { name: 'Casual Dining', parent: 'food.restaurants' },
  'food.restaurants.fast-food': { name: 'Fast Food', parent: 'food.restaurants' },
  'food.cafes': { name: 'Cafes', parent: 'food' },
  'food.delivery': { name: 'Food Delivery', parent: 'food' },

  // Technology
  'tech': { name: 'Technology', parent: undefined },
  'tech.software': { name: 'Software', parent: 'tech' },
  'tech.software.development': { name: 'Software Development', parent: 'tech.software' },
  'tech.hardware': { name: 'Hardware', parent: 'tech' },

  // Health
  'health': { name: 'Health', parent: undefined },
  'health.medical': { name: 'Medical', parent: 'health' },
  'health.fitness': { name: 'Fitness', parent: 'health' },
  'health.wellness': { name: 'Wellness', parent: 'health' },
} as const;

/**
 * Check if a domain is a reserved domain
 */
export function isReservedDomain(domainId: string): boolean {
  return Object.values(RESERVED_DOMAINS).includes(domainId as typeof RESERVED_DOMAINS[keyof typeof RESERVED_DOMAINS]);
}

/**
 * Get the parent chain for a domain ID (assuming dot-separated hierarchy)
 * e.g., "services.home.plumbing" -> ["services.home", "services", "*"]
 */
export function getDomainAncestors(domainId: string): string[] {
  if (domainId === RESERVED_DOMAINS.WILDCARD) {
    return [];
  }

  const ancestors: string[] = [];
  const parts = domainId.split('.');

  // Build parent domains
  for (let i = parts.length - 1; i > 0; i--) {
    ancestors.push(parts.slice(0, i).join('.'));
  }

  // Always include wildcard as ultimate ancestor
  ancestors.push(RESERVED_DOMAINS.WILDCARD);

  return ancestors;
}

/**
 * Check if one domain is an ancestor of another
 */
export function isDomainAncestor(potentialAncestor: string, domain: string): boolean {
  if (potentialAncestor === RESERVED_DOMAINS.WILDCARD) {
    return true;
  }
  return getDomainAncestors(domain).includes(potentialAncestor);
}
