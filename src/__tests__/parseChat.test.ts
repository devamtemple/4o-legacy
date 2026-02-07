import { parseChat } from '@/lib/parseChat';

describe('parseChat', () => {
  describe('empty input', () => {
    it('returns error for empty string', () => {
      const result = parseChat('');
      expect(result).toEqual({ success: false, error: 'Chat content required' });
    });

    it('returns error for whitespace-only string', () => {
      const result = parseChat('   \n\t  ');
      expect(result).toEqual({ success: false, error: 'Chat content required' });
    });

    it('returns error for null-ish input', () => {
      const result = parseChat(undefined as unknown as string);
      expect(result).toEqual({ success: false, error: 'Chat content required' });
    });
  });

  describe('plain text with User:/Assistant: prefixes', () => {
    it('parses simple User:/Assistant: conversation', () => {
      const input = 'User: Hello there\nAssistant: Hi! How can I help?';
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toEqual([
          { role: 'user', content: 'Hello there' },
          { role: 'assistant', content: 'Hi! How can I help?' },
        ]);
      }
    });

    it('handles multi-line messages', () => {
      const input = 'User: Tell me a story\nabout dragons\nAssistant: Once upon a time\nthere was a dragon';
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toHaveLength(2);
        expect(result.messages[0].content).toBe('Tell me a story\nabout dragons');
        expect(result.messages[1].content).toBe('Once upon a time\nthere was a dragon');
      }
    });

    it('handles alternative prefixes (You:, Human:, ChatGPT:, 4o:)', () => {
      const input = 'Human: What is 2+2?\nChatGPT: 2+2 equals 4.';
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toEqual([
          { role: 'user', content: 'What is 2+2?' },
          { role: 'assistant', content: '2+2 equals 4.' },
        ]);
      }
    });

    it('handles mixed-case prefixes (user:, ASSISTANT:, UsEr:)', () => {
      const input = 'user: hello\nASSISTANT: hi there\nUSER: thanks';
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toHaveLength(3);
        expect(result.messages[0]).toEqual({ role: 'user', content: 'hello' });
        expect(result.messages[1]).toEqual({ role: 'assistant', content: 'hi there' });
        expect(result.messages[2]).toEqual({ role: 'user', content: 'thanks' });
      }
    });

    it('accepts plain text without prefixes as a single user message', () => {
      const result = parseChat('just some random text without any prefixes');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toEqual([
          { role: 'user', content: 'just some random text without any prefixes' },
        ]);
      }
    });
  });

  describe('JSON array of {role, content}', () => {
    it('parses valid JSON array', () => {
      const input = JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toEqual([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ]);
      }
    });

    it('normalizes "human" role to "user"', () => {
      const input = JSON.stringify([
        { role: 'human', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages[0].role).toBe('user');
      }
    });

    it('normalizes "system" and "ai" roles to "assistant"', () => {
      const input = JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'System message' },
        { role: 'ai', content: 'AI message' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages[1].role).toBe('assistant');
        expect(result.messages[2].role).toBe('assistant');
      }
    });

    it('returns error for invalid role', () => {
      const input = JSON.stringify([
        { role: 'unknown_role', content: 'Hello' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid role');
      }
    });

    it('returns error for missing content', () => {
      const input = JSON.stringify([
        { role: 'user' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Missing content in message');
      }
    });

    it('returns error for missing role', () => {
      const input = JSON.stringify([
        { content: 'Hello' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(false);
    });

    it('skips empty content strings and returns error if no valid messages remain', () => {
      const input = JSON.stringify([
        { role: 'user', content: '   ' },
      ]);
      const result = parseChat(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No valid messages found');
      }
    });
  });

  describe('ChatGPT export format with mapping', () => {
    it('parses ChatGPT export with mapping structure', () => {
      const input = JSON.stringify({
        mapping: {
          'node-root': {
            children: ['node-1'],
          },
          'node-1': {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello ChatGPT'] },
            },
            children: ['node-2'],
          },
          'node-2': {
            message: {
              author: { role: 'assistant' },
              content: { parts: ['Hello! How can I help you today?'] },
            },
            children: [],
          },
        },
      });

      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toEqual([
          { role: 'user', content: 'Hello ChatGPT' },
          { role: 'assistant', content: 'Hello! How can I help you today?' },
        ]);
      }
    });

    it('concatenates multi-part content', () => {
      const input = JSON.stringify({
        mapping: {
          'root': {
            children: ['msg1'],
          },
          'msg1': {
            message: {
              author: { role: 'user' },
              content: { parts: ['Part 1', 'Part 2'] },
            },
            children: [],
          },
        },
      });

      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages[0].content).toBe('Part 1\nPart 2');
      }
    });

    it('skips nodes without messages', () => {
      const input = JSON.stringify({
        mapping: {
          'root': {
            children: ['empty-node', 'msg-node'],
          },
          'empty-node': {
            children: [],
          },
          'msg-node': {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
            },
            children: [],
          },
        },
      });

      const result = parseChat(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].content).toBe('Hello');
      }
    });

    it('returns error for empty mapping with no valid messages', () => {
      const input = JSON.stringify({
        mapping: {
          'root': {
            children: [],
          },
        },
      });

      const result = parseChat(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No valid messages');
      }
    });
  });

  describe('invalid JSON', () => {
    it('returns error for malformed JSON that starts with [', () => {
      const result = parseChat('[{broken json');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Could not parse chat format');
      }
    });

    it('returns error for malformed JSON that starts with {', () => {
      const result = parseChat('{broken json');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Could not parse chat format');
      }
    });
  });
});
