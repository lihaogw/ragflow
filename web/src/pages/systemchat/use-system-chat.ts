/*
 *  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Authorization } from '@/constants/authorization';
import { MessageType } from '@/constants/chat';
import {
  getSystemChatCompletionUrl,
  getSystemChatPrologue,
  SystemChatId,
} from '@/constants/system-chat';
import { IMessage } from '@/interfaces/database/chat';
import {
  parseCompletionEventStream,
  readJsonSafely,
} from '@/services/chat-completion-stream';
import { getAuthorization } from '@/utils/authorization-util';
import { mergeAnswerChunk } from '@/utils/chat';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

// SSE chunks arrive faster than the transcript needs to repaint; coalescing
// updates keeps a long system-chat answer cheap to render.
const AnswerFlushIntervalMs = 60;

const buildPrologueMessage = (): IMessage => ({
  role: MessageType.Assistant,
  content: getSystemChatPrologue(),
  id: 'system-chat-prologue',
  conversationId: SystemChatId,
});

/**
 * Drives the system chat against the host backend. Every request uses the
 * fixed conversation id and `{serverConfig}/v1/conversation/completion`, so it
 * never touches the RAGFlow chat/session APIs.
 */
export function useSystemChat() {
  const [messages, setMessages] = useState<IMessage[]>(() => [
    buildPrologueMessage(),
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesRef = useRef(messages);
  const streamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || streamingRef.current) {
      return 'ignored' as const;
    }

    const history = messagesRef.current.map(({ role, content }) => ({
      role,
      content,
    }));
    const questionId = uuid();
    const answerId = uuid();
    const controller = new AbortController();

    abortControllerRef.current = controller;
    streamingRef.current = true;
    setIsStreaming(true);

    setMessages((previous) => [
      ...previous,
      {
        role: MessageType.User,
        content: text,
        id: questionId,
        conversationId: SystemChatId,
      },
      {
        role: MessageType.Assistant,
        content: '',
        id: answerId,
        conversationId: SystemChatId,
      },
    ]);

    let accumulatedAnswer = '';
    let aborted = false;
    let failed = false;
    let lastFlushAt = 0;

    const flushAnswer = () => {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === answerId
            ? { ...message, content: accumulatedAnswer }
            : message,
        ),
      );
      lastFlushAt = Date.now();
    };

    try {
      const response = await fetch(getSystemChatCompletionUrl(), {
        method: 'POST',
        headers: {
          [Authorization]: getAuthorization(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: SystemChatId,
          messages: [...history, { role: MessageType.User, content: text }],
        }),
        signal: controller.signal,
      });

      // A stream body is not JSON, so this resolves to undefined on success;
      // a parseable body means the endpoint answered with an error envelope.
      const errorBodyPromise = readJsonSafely(response.clone());

      try {
        for await (const chunk of parseCompletionEventStream(response)) {
          accumulatedAnswer = mergeAnswerChunk(accumulatedAnswer, chunk);

          if (
            chunk.final ||
            Date.now() - lastFlushAt >= AnswerFlushIntervalMs
          ) {
            flushAnswer();
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          aborted = true;
        } else {
          throw error;
        }
      }

      const errorBody = await errorBodyPromise;

      if (
        !aborted &&
        (response.status !== 200 ||
          (errorBody !== undefined && errorBody.code !== 0))
      ) {
        failed = true;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        aborted = true;
      } else {
        failed = true;
      }
    } finally {
      // Whatever arrived before a stop stays visible.
      flushAnswer();
      streamingRef.current = false;
      setIsStreaming(false);
      abortControllerRef.current = undefined;
    }

    if (failed) {
      // Hand the question back to the input box; the caller owns that state.
      setMessages((previous) =>
        previous.filter(
          (message) => message.id !== answerId && message.id !== questionId,
        ),
      );
      return 'failed' as const;
    }

    return aborted ? ('aborted' as const) : ('ok' as const);
  }, []);

  const stopOutputMessage = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopOutputMessage,
  };
}
