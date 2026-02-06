import {
  sanitizeContent,
  validateAttestations,
  validateCategories,
  VALID_CATEGORIES,
} from '@/lib/validation';
import { Attestations } from '@/types';

describe('sanitizeContent', () => {
  it('escapes & characters', () => {
    expect(sanitizeContent('a & b')).toBe('a &amp; b');
  });

  it('escapes < characters', () => {
    expect(sanitizeContent('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes > characters', () => {
    expect(sanitizeContent('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(sanitizeContent('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeContent("it's")).toBe('it&#039;s');
  });

  it('escapes all XSS characters in a combined string', () => {
    const input = '<img src="x" onerror="alert(\'xss\')"> & more';
    const result = sanitizeContent(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeContent('')).toBe('');
  });

  it('does not modify safe content', () => {
    const safe = 'Hello world 123';
    expect(sanitizeContent(safe)).toBe(safe);
  });
});

describe('validateAttestations', () => {
  it('returns error for undefined attestations', () => {
    const result = validateAttestations(undefined);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Attestations required');
    }
  });

  it('returns valid for all-true attestations', () => {
    const attestations: Attestations = {
      hasRightToShare: true,
      agreesToTerms: true,
      allowTraining: true,
      timestamp: new Date().toISOString(),
    };
    expect(validateAttestations(attestations)).toEqual({ valid: true });
  });

  it('returns error when hasRightToShare is false', () => {
    const attestations: Attestations = {
      hasRightToShare: false,
      agreesToTerms: true,
      allowTraining: true,
      timestamp: new Date().toISOString(),
    };
    const result = validateAttestations(attestations);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('All attestations must be confirmed');
    }
  });

  it('returns error when agreesToTerms is false', () => {
    const attestations: Attestations = {
      hasRightToShare: true,
      agreesToTerms: false,
      allowTraining: true,
      timestamp: new Date().toISOString(),
    };
    const result = validateAttestations(attestations);
    expect(result.valid).toBe(false);
  });

  it('returns valid when allowTraining is false but required fields are true', () => {
    const attestations: Attestations = {
      hasRightToShare: true,
      agreesToTerms: true,
      allowTraining: false,
      timestamp: new Date().toISOString(),
    };
    const result = validateAttestations(attestations);
    expect(result.valid).toBe(true);
  });

  it('returns error when all required attestations are false', () => {
    const attestations: Attestations = {
      hasRightToShare: false,
      agreesToTerms: false,
      allowTraining: true,
      timestamp: new Date().toISOString(),
    };
    const result = validateAttestations(attestations);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('All attestations must be confirmed');
    }
  });
});

describe('validateCategories', () => {
  it('returns empty array for undefined input', () => {
    expect(validateCategories(undefined)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(validateCategories('grief')).toEqual([]);
    expect(validateCategories(42)).toEqual([]);
    expect(validateCategories(null)).toEqual([]);
  });

  it('returns valid categories from array', () => {
    const result = validateCategories(['grief', 'humor-wit']);
    expect(result).toEqual(['grief', 'humor-wit']);
  });

  it('filters out invalid categories', () => {
    const result = validateCategories(['grief', 'invalid-category', 'meta']);
    expect(result).toEqual(['grief', 'meta']);
  });

  it('returns empty array when all categories are invalid', () => {
    const result = validateCategories(['not-real', 'also-fake']);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(validateCategories([])).toEqual([]);
  });

  it('accepts all valid category values', () => {
    const result = validateCategories([...VALID_CATEGORIES]);
    expect(result).toEqual(VALID_CATEGORIES);
    expect(result).toHaveLength(15);
  });
});

describe('title and commentary truncation (integration)', () => {
  // These test the truncation behavior as used in the route
  // sanitizeContent + slice(0, 200) for title, slice(0, 2000) for commentary

  it('title is truncated to 200 chars after sanitization', () => {
    const longTitle = 'A'.repeat(300);
    const sanitized = sanitizeContent(longTitle.trim()).slice(0, 200);
    expect(sanitized).toHaveLength(200);
  });

  it('commentary is truncated to 2000 chars after sanitization', () => {
    const longCommentary = 'B'.repeat(3000);
    const sanitized = sanitizeContent(longCommentary.trim()).slice(0, 2000);
    expect(sanitized).toHaveLength(2000);
  });

  it('title with XSS chars: truncation applied after sanitization', () => {
    // '<' becomes '&lt;' (4 chars from 1), so a string of 200 '<' chars
    // becomes 800 chars after sanitization, then truncated to 200
    const xssTitle = '<'.repeat(200);
    const sanitized = sanitizeContent(xssTitle.trim()).slice(0, 200);
    expect(sanitized).toHaveLength(200);
    expect(sanitized).not.toContain('<');
  });
});
