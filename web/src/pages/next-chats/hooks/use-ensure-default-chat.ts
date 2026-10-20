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

import { ChatApiAction, useCreateChat } from '@/hooks/use-chat-request';
import { useFetchKnowledgeList } from '@/hooks/use-knowledge-request';
import { useFetchDefaultModelDictionaryWithLoading } from '@/hooks/use-llm-request';
import { IDialog } from '@/interfaces/database/chat';
import {
  getSystemChatPrologue,
  SystemAssistantLlmId,
  SystemAssistantName,
} from '@/constants/system-chat';
import chatService from '@/services/next-chat-service';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const ChatEntryKeys = {
  list: () => [ChatApiAction.FetchChatList, 'entry'] as const,
};

// Guards against React StrictMode mounting the entry twice and creating two
// assistants before the first request resolves.
let pendingDefaultChat: Promise<string | undefined> | null = null;

/**
 * Resolves the assistant `/chat` opens: the first existing chat, or a default
 * one named after the host's assistant, created with every dataset selected.
 */
export function useEnsureDefaultChat() {
  const { t } = useTranslation();
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState(false);

  const {
    data: chats = [],
    isFetching,
    isError: chatsError,
  } = useQuery<IDialog[]>({
    queryKey: ChatEntryKeys.list(),
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await chatService.listChats(
        { params: { page: 1, page_size: 1 } },
        true,
      );

      return data?.data?.chats ?? [];
    },
  });

  // Datasets and the default model are only needed when this entry has to
  // create the assistant; an existing assistant is opened without them.
  const shouldCreateDefault = !isFetching && !chatsError && chats.length === 0;
  const {
    list: datasets,
    loading: datasetLoading,
    isError: datasetsError,
  } = useFetchKnowledgeList(false, '', 1000, undefined, shouldCreateDefault);
  const defaultModel = useFetchDefaultModelDictionaryWithLoading(
    false,
    shouldCreateDefault,
  );
  const { createChat, loading: creating } = useCreateChat();

  const initialData = useMemo(
    () => ({
      name: SystemAssistantName,
      icon: '',
      language: 'English',
      description: '',
      dataset_ids: datasets.map((dataset) => dataset.id),
      prompt_config: {
        empty_response: '',
        prologue: getSystemChatPrologue(),
        quote: true,
        keyword: false,
        tts: false,
        system: t('chat.systemInitialValue'),
        refine_multiturn: false,
        use_kg: false,
        reasoning: false,
        parameters: [
          { key: 'knowledge', optional: false },
          { key: 'date', optional: true },
        ],
        toc_enhance: false,
      },
      llm_id: defaultModel.dictionary.llm_id || SystemAssistantLlmId,
      tenant_llm_id: defaultModel.dictionary.llm_id || SystemAssistantLlmId,
      llm_setting: {},
      similarity_threshold: 0.2,
      keywords_similarity_weight: 0.7,
      top_n: 8,
      rerank_candidates_count: 64,
    }),
    [datasets, defaultModel.dictionary.llm_id, t],
  );

  const createDefaultChat = useCallback(async () => {
    pendingDefaultChat ??= createChat(initialData)
      .then((ret) => (ret?.code === 0 ? ret.data?.id : undefined))
      .finally(() => {
        pendingDefaultChat = null;
      });

    return pendingDefaultChat;
  }, [createChat, initialData]);

  useEffect(() => {
    if (isFetching || chatId || creating || error) {
      return;
    }

    if (chatsError) {
      setError(true);
      return;
    }

    if (chats.length > 0) {
      setChatId(chats[0].id);
      return;
    }

    if (datasetLoading || defaultModel.loading) {
      return;
    }

    if (datasetsError || defaultModel.isError) {
      setError(true);
      return;
    }

    let cancelled = false;

    createDefaultChat()
      .then((id) => {
        if (cancelled) return;
        if (id) {
          setChatId(id);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    chatId,
    chats,
    createDefaultChat,
    chatsError,
    creating,
    datasetLoading,
    datasetsError,
    defaultModel.isError,
    defaultModel.loading,
    error,
    isFetching,
  ]);

  const retry = useCallback(() => {
    // Reloading reruns the chat-list, dataset and default-model queries, so a
    // retry recovers from a failure in any of them.
    window.location.reload();
  }, []);

  return {
    chatId,
    loading: isFetching || datasetLoading || defaultModel.loading || creating,
    error,
    retry,
  };
}
