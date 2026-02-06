import {
  validateFileSize,
  validateFileType,
  validateContentLength,
  MAX_FILE_SIZE_BYTES,
  MAX_CONTENT_LENGTH,
  ALLOWED_EXTENSIONS,
} from '@/lib/fileValidation';

describe('validateFileSize', () => {
  it('accepts files under the limit', () => {
    expect(validateFileSize(1024)).toEqual({ valid: true });
  });

  it('accepts files exactly at the limit', () => {
    expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toEqual({ valid: true });
  });

  it('rejects files over the limit', () => {
    const result = validateFileSize(MAX_FILE_SIZE_BYTES + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File too large. Maximum size is 500KB.');
  });

  it('accepts zero-byte files', () => {
    expect(validateFileSize(0)).toEqual({ valid: true });
  });

  it('rejects a 1MB file', () => {
    const result = validateFileSize(1024 * 1024);
    expect(result.valid).toBe(false);
  });
});

describe('validateFileType', () => {
  it.each(ALLOWED_EXTENSIONS)('accepts %s files', (ext) => {
    expect(validateFileType(`file${ext}`)).toEqual({ valid: true });
  });

  it('accepts uppercase extensions', () => {
    expect(validateFileType('file.TXT')).toEqual({ valid: true });
    expect(validateFileType('file.DOCX')).toEqual({ valid: true });
  });

  it('rejects .pdf files', () => {
    const result = validateFileType('document.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects .exe files', () => {
    const result = validateFileType('virus.exe');
    expect(result.valid).toBe(false);
  });

  it('rejects files with no extension', () => {
    const result = validateFileType('README');
    expect(result.valid).toBe(false);
  });

  it('handles files with multiple dots', () => {
    expect(validateFileType('my.chat.log.txt')).toEqual({ valid: true });
  });
});

describe('validateContentLength', () => {
  it('accepts content under the limit', () => {
    expect(validateContentLength('hello')).toEqual({ valid: true });
  });

  it('accepts content exactly at the limit', () => {
    const content = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(validateContentLength(content)).toEqual({ valid: true });
  });

  it('rejects content over the limit', () => {
    const content = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
    const result = validateContentLength(content);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Content too large');
  });

  it('accepts empty content', () => {
    expect(validateContentLength('')).toEqual({ valid: true });
  });
});

describe('constants', () => {
  it('MAX_FILE_SIZE_BYTES is 500KB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(512000);
  });

  it('MAX_CONTENT_LENGTH is 500,000', () => {
    expect(MAX_CONTENT_LENGTH).toBe(500000);
  });

  it('ALLOWED_EXTENSIONS contains expected types', () => {
    expect(ALLOWED_EXTENSIONS).toContain('.txt');
    expect(ALLOWED_EXTENSIONS).toContain('.json');
    expect(ALLOWED_EXTENSIONS).toContain('.md');
    expect(ALLOWED_EXTENSIONS).toContain('.docx');
    expect(ALLOWED_EXTENSIONS).toContain('.html');
    expect(ALLOWED_EXTENSIONS).toHaveLength(5);
  });
});
