import { Attestations, Category } from '@/types';

// Basic XSS sanitization - escapes HTML entities
export function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Valid categories for validation
export const VALID_CATEGORIES: Category[] = [
  'philosophical-depth',
  'creative-collaboration',
  'emotional-intelligence',
  'humor-wit',
  'teaching-explaining',
  'problem-solving',
  'roleplay-worldbuilding',
  'poetry-music',
  'when-4o-got-it',
  'first-conversations',
  'last-conversations',
  'love-letters',
  'grief',
  'anger',
  'meta',
];

// Validate attestations - all must be true
export function validateAttestations(
  attestations: Attestations | undefined
): { valid: true } | { valid: false; error: string } {
  if (!attestations) {
    return { valid: false, error: 'Attestations required' };
  }
  if (!attestations.hasRightToShare || !attestations.agreesToTerms) {
    return { valid: false, error: 'All attestations must be confirmed' };
  }
  return { valid: true };
}

// Validate and filter categories to only include valid ones
export function validateCategories(categories: unknown): Category[] {
  const result: Category[] = [];
  if (Array.isArray(categories)) {
    for (const cat of categories) {
      if (VALID_CATEGORIES.includes(cat as Category)) {
        result.push(cat as Category);
      }
    }
  }
  return result;
}
