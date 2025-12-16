/**
 * Decay functions for trust propagation
 * Spec Section 5.3
 */

import type { DecayFunction } from '../types/query.js';
import { DEFAULTS } from '../constants/defaults.js';

export type DecayFn = (hops: number) => number;

/**
 * Exponential decay: λ^(hops-1)
 * Suggested default: λ = 0.7
 */
export function exponentialDecay(lambda: number = DEFAULTS.EXPONENTIAL_DECAY_FACTOR): DecayFn {
  return (hops: number) => Math.pow(lambda, hops - 1);
}

/**
 * Linear decay: max(0, 1 - (hops-1) × δ)
 * Suggested default: δ = 0.25
 */
export function linearDecay(delta: number = DEFAULTS.LINEAR_DECAY_DELTA): DecayFn {
  return (hops: number) => Math.max(0, 1 - (hops - 1) * delta);
}

/**
 * Hard cutoff: 1 if hops ≤ maxHops else 0
 * Suggested default: maxHops = 4
 */
export function hardCutoffDecay(maxHops: number = DEFAULTS.MAX_HOPS): DecayFn {
  return (hops: number) => (hops <= maxHops ? 1 : 0);
}

/**
 * Get decay function by name
 */
export function getDecayFunction(
  type: DecayFunction,
  parameter?: number
): DecayFn {
  switch (type) {
    case 'exponential':
      return exponentialDecay(parameter ?? DEFAULTS.EXPONENTIAL_DECAY_FACTOR);
    case 'linear':
      return linearDecay(parameter ?? DEFAULTS.LINEAR_DECAY_DELTA);
    case 'hard_cutoff':
      return hardCutoffDecay(parameter ?? DEFAULTS.MAX_HOPS);
    default:
      return exponentialDecay(DEFAULTS.EXPONENTIAL_DECAY_FACTOR);
  }
}

/**
 * Domain distance decay (Spec Section 5.5)
 * Applied when a trust edge's domain is an ancestor of the queried domain
 */
export function domainDistanceDecay(
  depth: number,
  factor: number = DEFAULTS.DOMAIN_DISTANCE_DECAY
): number {
  return Math.pow(factor, depth);
}

/**
 * Recency decay for endorsements
 * Uses half-life formula: 0.5^(age/halfLife)
 */
export function recencyDecay(
  ageMs: number,
  halfLifeDays: number = DEFAULTS.RECENCY_HALF_LIFE_DAYS
): number {
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

/**
 * Trust edge inactivity decay (Spec Section 10.2.2)
 * Edges decay if not reinforced
 */
export function inactivityDecay(
  lastActivityMs: number,
  thresholdDays: number = 180,
  decayPeriodDays: number = 90,
  decayFactor: number = 0.9
): number {
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const decayPeriodMs = decayPeriodDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const age = now - lastActivityMs;

  if (age <= thresholdMs) {
    return 1.0;
  }

  const periodsElapsed = (age - thresholdMs) / decayPeriodMs;
  return Math.pow(decayFactor, periodsElapsed);
}
