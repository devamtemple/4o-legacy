export const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB
export const MAX_CONTENT_LENGTH = 500_000; // 500,000 characters
export const ALLOWED_EXTENSIONS = ['.txt', '.json', '.md', '.docx', '.html'];

export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File too large. Maximum size is 500KB.' };
  }
  return { valid: true };
}

export function validateFileType(fileName: string): { valid: boolean; error?: string } {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use .txt, .json, .md, .docx, or .html',
    };
  }
  return { valid: true };
}

export function validateContentLength(content: string): { valid: boolean; error?: string } {
  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: 'Content too large. Maximum length is 500,000 characters.',
    };
  }
  return { valid: true };
}
