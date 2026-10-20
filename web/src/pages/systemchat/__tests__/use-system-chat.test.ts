import { act, renderHook } from '@testing-library/react';
import { SystemChatId } from '@/constants/system-chat';
import { useSystemChat } from '../use-system-chat';

const OriginalFetch = globalThis.fetch;

const buildSseResponse = (chunks: string[]) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return {
    status: 200,
    body,
    clone: () => ({
      json: () => Promise.reject(new Error('not json')),
    }),
  } as unknown as Response;
};

beforeAll(() => {
  const streamWeb = require('node:stream/web');

  if (typeof globalThis.ReadableStream === 'undefined') {
    (globalThis as any).ReadableStream = streamWeb.ReadableStream;
  }
  if (typeof globalThis.TextDecoderStream === 'undefined') {
    (globalThis as any).TextDecoderStream = streamWeb.TextDecoderStream;
  }
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('serverConfig', 'https://host.example:5000/');
});

afterEach(() => {
  globalThis.fetch = OriginalFetch;
});

describe('useSystemChat', () => {
  it('posts to the host endpoint with the fixed conversation id and applies stream chunks', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        buildSseResponse([
          'data: {"data":{"answer":"Hello"}}\n\n',
          'data: {"data":{"answer":"Hello world","final":true}}\n\n',
          'data: {"data":true}\n\n',
        ]),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useSystemChat());

    let status:
      | Awaited<ReturnType<typeof result.current.sendMessage>>
      | undefined;
    await act(async () => {
      status = await result.current.sendMessage('hi');
    });

    expect(status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://host.example:5000/v1/conversation/completion');

    const body = JSON.parse(init.body as string);
    expect(body.conversation_id).toBe(SystemChatId);
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'hi' });
    expect(body.messages.at(-2)).toMatchObject({ role: 'assistant' });

    const messages = result.current.messages;
    expect(messages.at(-2)).toMatchObject({ role: 'user', content: 'hi' });
    expect(messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'Hello world',
    });
    expect(messages.at(-1)?.conversationId).toBe(SystemChatId);
  });
});
