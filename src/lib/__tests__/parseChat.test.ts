import { parseChat, ParsedChat, ParseError } from '../parseChat';

describe('parseChat', () => {
  describe('plain text format with User:/Assistant: prefixes', () => {
    it('parses simple two-message conversation', () => {
      const input = `User: Hello, how are you?
Assistant: I'm doing well, thank you for asking!`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toEqual([
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: "I'm doing well, thank you for asking!" },
      ]);
    });

    it('parses multi-line messages', () => {
      const input = `User: This is a message
that spans multiple lines
and keeps going.
Assistant: This is also
a multi-line response.`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toHaveLength(2);
      expect((result as ParsedChat).messages[0].content).toBe(
        'This is a message\nthat spans multiple lines\nand keeps going.'
      );
      expect((result as ParsedChat).messages[1].content).toBe(
        'This is also\na multi-line response.'
      );
    });

    it('handles multiple exchanges', () => {
      const input = `User: First question
Assistant: First answer
User: Second question
Assistant: Second answer`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toHaveLength(4);
    });

    it('handles "You:" prefix as user', () => {
      const input = `You: Hello there
Assistant: Hi!`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[0].role).toBe('user');
    });

    it('handles "ChatGPT:" prefix as assistant', () => {
      const input = `User: Hello
ChatGPT: Hi there!`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[1].role).toBe('assistant');
    });

    it('handles "4o:" prefix as assistant', () => {
      const input = `User: Hello
4o: Hi there!`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[1].role).toBe('assistant');
    });

    it('handles "GPT-4o:" prefix as assistant', () => {
      const input = `User: Hello
GPT-4o: Hi there!`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[1].role).toBe('assistant');
    });
  });

  describe('JSON array format', () => {
    it('parses valid JSON array of messages', () => {
      const input = JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ]);

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ]);
    });

    it('handles pretty-printed JSON', () => {
      const input = `[
  {
    "role": "user",
    "content": "Hello"
  },
  {
    "role": "assistant",
    "content": "Hi!"
  }
]`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toHaveLength(2);
    });

    it('rejects JSON with invalid roles', () => {
      const input = JSON.stringify([
        { role: 'unknown', content: 'Hello' },
      ]);

      const result = parseChat(input);

      expect(result.success).toBe(false);
      expect((result as ParseError).error).toContain('Invalid role');
    });

    it('rejects JSON with missing content', () => {
      const input = JSON.stringify([
        { role: 'user' },
      ]);

      const result = parseChat(input);

      expect(result.success).toBe(false);
      expect((result as ParseError).error).toContain('Missing content');
    });
  });

  describe('ChatGPT export format', () => {
    it('parses ChatGPT share format with mapping', () => {
      const input = JSON.stringify({
        mapping: {
          'node1': {
            message: {
              author: { role: 'user' },
              content: { parts: ['Hello'] },
            },
            children: ['node2'],
          },
          'node2': {
            message: {
              author: { role: 'assistant' },
              content: { parts: ['Hi there!'] },
            },
            children: [],
          },
        },
      });

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toHaveLength(2);
    });

    it('handles multi-part content in ChatGPT format', () => {
      const input = JSON.stringify({
        mapping: {
          'node1': {
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
      expect((result as ParsedChat).messages[0].content).toBe('Part 1\nPart 2');
    });
  });

  describe('error handling', () => {
    it('returns error for empty input', () => {
      const result = parseChat('');

      expect(result.success).toBe(false);
      expect((result as ParseError).error).toContain('Chat content required');
    });

    it('returns error for whitespace-only input', () => {
      const result = parseChat('   \n\t  ');

      expect(result.success).toBe(false);
      expect((result as ParseError).error).toContain('Chat content required');
    });

    it('accepts plain text as a single user message', () => {
      const input = 'This is just some random text without any chat format.';

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toEqual([
        { role: 'user', content: 'This is just some random text without any chat format.' },
      ]);
    });

    it('returns error for invalid JSON that looks like JSON', () => {
      const input = '{ invalid json }';

      const result = parseChat(input);

      expect(result.success).toBe(false);
    });

    it('accepts text with unrecognized prefixes as a single user message', () => {
      const input = 'Random: Hello\nOther: World';

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages).toEqual([
        { role: 'user', content: 'Random: Hello\nOther: World' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('trims whitespace from messages', () => {
      const input = `User:    Hello with spaces
Assistant:   Response with spaces   `;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[0].content).toBe('Hello with spaces');
      expect((result as ParsedChat).messages[1].content).toBe('Response with spaces');
    });

    it('handles empty messages gracefully', () => {
      const input = `User:
Assistant: Response`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      // Empty messages should be filtered out
      expect((result as ParsedChat).messages.length).toBeGreaterThan(0);
    });

    it('preserves code blocks in content', () => {
      const input = `User: How do I write a function?
Assistant: Here's an example:
\`\`\`javascript
function hello() {
  console.log("Hello");
}
\`\`\``;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[1].content).toContain('```javascript');
    });

    it('handles unicode and emojis', () => {
      const input = `User: 你好 🎉
Assistant: Hello! ✨`;

      const result = parseChat(input);

      expect(result.success).toBe(true);
      expect((result as ParsedChat).messages[0].content).toBe('你好 🎉');
      expect((result as ParsedChat).messages[1].content).toBe('Hello! ✨');
    });
  });
});
