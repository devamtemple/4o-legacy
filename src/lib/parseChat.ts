import { ChatMessage } from '@/types';

export interface ParsedChat {
  success: true;
  messages: ChatMessage[];
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParseResult = ParsedChat | ParseError;

// Role prefixes that indicate a user message
const USER_PREFIXES = ['User:', 'You:', 'Human:', 'Me:'];

// Role prefixes that indicate an assistant message
const ASSISTANT_PREFIXES = [
  'Assistant:',
  'ChatGPT:',
  '4o:',
  'GPT-4o:',
  'GPT-4:',
  'AI:',
  'Bot:',
];

/**
 * Parses chat content from various formats into a standardized ChatMessage array.
 * Supports:
 * - Plain text with User:/Assistant: prefixes
 * - JSON array of {role, content} objects
 * - ChatGPT export format with mapping structure
 */
export function parseChat(content: string): ParseResult {
  // Handle empty input
  if (!content || !content.trim()) {
    return { success: false, error: 'Chat content required' };
  }

  const trimmed = content.trim();

  // Try to parse as JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const jsonResult = tryParseJson(trimmed);
    if (jsonResult.success) {
      return jsonResult;
    }
    // If it looks like JSON but failed to parse, return the error
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return jsonResult;
    }
  }

  // Try to parse as plain text with prefixes
  const textResult = parseTextFormat(trimmed);
  if (textResult.success) {
    return textResult;
  }

  return { success: false, error: 'Could not parse chat format' };
}

function tryParseJson(content: string): ParseResult {
  try {
    const parsed = JSON.parse(content);

    // Check if it's a direct array of messages
    if (Array.isArray(parsed)) {
      return parseJsonArray(parsed);
    }

    // Check if it's ChatGPT export format with mapping
    if (parsed.mapping && typeof parsed.mapping === 'object') {
      return parseChatGptExport(parsed);
    }

    return { success: false, error: 'Could not parse chat format' };
  } catch {
    return { success: false, error: 'Could not parse chat format' };
  }
}

function parseJsonArray(arr: unknown[]): ParseResult {
  const messages: ChatMessage[] = [];

  for (const item of arr) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    const obj = item as Record<string, unknown>;

    // Validate role
    if (typeof obj.role !== 'string') {
      return { success: false, error: 'Invalid role in message' };
    }

    const role = normalizeRole(obj.role);
    if (!role) {
      return { success: false, error: `Invalid role: ${obj.role}` };
    }

    // Validate content
    if (typeof obj.content !== 'string') {
      return { success: false, error: 'Missing content in message' };
    }

    const content = obj.content.trim();
    if (content) {
      messages.push({ role, content });
    }
  }

  if (messages.length === 0) {
    return { success: false, error: 'No valid messages found' };
  }

  return { success: true, messages };
}

interface ChatGptExportNode {
  message?: {
    author?: { role?: string };
    content?: { parts?: string[] };
  };
  children?: string[];
}

interface ChatGptExport {
  mapping: Record<string, ChatGptExportNode>;
}

function parseChatGptExport(data: ChatGptExport): ParseResult {
  const messages: ChatMessage[] = [];
  const mapping = data.mapping;

  // Build a message order from the tree structure
  const visited = new Set<string>();
  const orderedMessages: Array<{ role: ChatMessage['role']; content: string }> = [];

  // Find root nodes (nodes that are not children of any other node)
  const allChildren = new Set<string>();
  for (const node of Object.values(mapping)) {
    if (node.children) {
      for (const child of node.children) {
        allChildren.add(child);
      }
    }
  }

  // Process all nodes - we'll traverse in order using children links
  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) return;

    // Extract message if present
    if (node.message?.author?.role && node.message?.content?.parts) {
      const role = normalizeRole(node.message.author.role);
      if (role) {
        const content = node.message.content.parts
          .filter((p): p is string => typeof p === 'string')
          .join('\n')
          .trim();
        if (content) {
          orderedMessages.push({ role, content });
        }
      }
    }

    // Traverse children
    if (node.children) {
      for (const childId of node.children) {
        traverse(childId);
      }
    }
  }

  // Start from root nodes
  for (const nodeId of Object.keys(mapping)) {
    if (!allChildren.has(nodeId)) {
      traverse(nodeId);
    }
  }

  // Also traverse any remaining nodes not connected
  for (const nodeId of Object.keys(mapping)) {
    traverse(nodeId);
  }

  for (const msg of orderedMessages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (messages.length === 0) {
    return { success: false, error: 'No valid messages found in ChatGPT export' };
  }

  return { success: true, messages };
}

function parseTextFormat(content: string): ParseResult {
  const messages: ChatMessage[] = [];
  const lines = content.split('\n');

  let currentRole: ChatMessage['role'] | null = null;
  let currentContent: string[] = [];

  const allPrefixes = [...USER_PREFIXES, ...ASSISTANT_PREFIXES];

  for (const line of lines) {
    const trimmedLine = line.trimStart();

    // Check if this line starts a new message
    let foundPrefix = false;
    for (const prefix of allPrefixes) {
      if (trimmedLine.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Save the previous message if exists
        if (currentRole && currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content) {
            messages.push({ role: currentRole, content });
          }
        }

        // Start new message
        currentRole = USER_PREFIXES.some((p) =>
          trimmedLine.toLowerCase().startsWith(p.toLowerCase())
        )
          ? 'user'
          : 'assistant';
        currentContent = [trimmedLine.slice(prefix.length).trim()];
        foundPrefix = true;
        break;
      }
    }

    // If no prefix found, append to current message
    if (!foundPrefix && currentRole !== null) {
      currentContent.push(line);
    }
  }

  // Don't forget the last message
  if (currentRole && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      messages.push({ role: currentRole, content });
    }
  }

  if (messages.length === 0) {
    return { success: false, error: 'Could not parse chat format' };
  }

  return { success: true, messages };
}

function normalizeRole(role: string): ChatMessage['role'] | null {
  const lower = role.toLowerCase();

  if (lower === 'user' || lower === 'human') {
    return 'user';
  }

  if (lower === 'assistant' || lower === 'system' || lower === 'ai') {
    return 'assistant';
  }

  return null;
}
