import { MessageType } from '@/constants/chat';
import { useTranslate } from '@/hooks/common-hooks';
import {
  useFetchChatList,
  useFetchSessionList,
  useGetChatSearchParams,
} from '@/hooks/use-chat-request';
import { IConversation } from '@/interfaces/database/chat';
import { generateConversationId } from '@/utils/chat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useChatUrlParams } from './use-chat-url';

export const useFindPrologueFromDialogList = () => {
  const { id: dialogId } = useParams();
  const { data } = useFetchChatList();

  const prologue = useMemo(() => {
    return data?.chats.find((x) => x.id === dialogId)?.prompt_config?.prologue;
  }, [dialogId, data]);

  return prologue;
};

export const useSelectDerivedConversationList = () => {
  const { t } = useTranslate('chat');

  const [list, setList] = useState<Array<IConversation>>([]);
  const {
    data: conversationList,
    loading,
    handleInputChange,
    searchString,
    setSearchString,
  } = useFetchSessionList();

  const { id: dialogId } = useParams();
  const { conversationId: currentConversationId, isNew } =
    useGetChatSearchParams();
  const prologue = useFindPrologueFromDialogList();
  const { setConversationBoth } = useChatUrlParams();

  const buildTemporaryConversation = useCallback(
    (conversationId: string): IConversation =>
      ({
        id: conversationId,
        name: t('newConversation'),
        chat_id: dialogId,
        is_new: true,
        messages: [
          {
            content: prologue,
            role: MessageType.Assistant,
          },
        ],
      }) as any,
    [dialogId, prologue, t],
  );

  const addTemporaryConversation = useCallback(() => {
    const conversationId = generateConversationId();
    // Clear the search keyword, otherwise the newly created session will be
    // filtered out by the search after it is persisted and refetched.
    setSearchString('');
    setList((pre) => {
      if (dialogId) {
        setConversationBoth(conversationId, 'true');
        return [
          buildTemporaryConversation(conversationId),
          ...conversationList,
        ];
      }

      return pre;
    });
  }, [
    buildTemporaryConversation,
    dialogId,
    setConversationBoth,
    conversationList,
    setSearchString,
  ]);

  const removeTemporaryConversation = useCallback((conversationId: string) => {
    setList((prevList) => {
      return prevList.filter(
        (conversation) => conversation.id !== conversationId,
      );
    });
  }, []);

  // When you first enter the page, select the top conversation card

  // useEffect(() => {
  //   setList((prevList) => {
  //     const tempItems = prevList.filter((item) => item.is_new);
  //     const existingTempIds = new Set(tempItems.map((t) => t.id));
  //     const newItems = conversationList.filter(
  //       (item) => !existingTempIds.has(item.id),
  //     );
  //     return [...tempItems, ...newItems];
  //   });
  // }, [conversationList]);

  useEffect(() => {
    setList([...conversationList]);
  }, [conversationList]);

  // The chat page can open a temporary conversation directly from the URL
  // (e.g. the host entry auto-selects one). Keep that conversation visible in
  // every consumer of this list, not only in the instance that created it.
  useEffect(() => {
    if (isNew !== 'true' || !currentConversationId || !dialogId) {
      return;
    }

    setList((previous) =>
      previous.some((x) => x.id === currentConversationId)
        ? previous
        : [buildTemporaryConversation(currentConversationId), ...previous],
    );
  }, [
    buildTemporaryConversation,
    conversationList,
    currentConversationId,
    dialogId,
    isNew,
  ]);

  return {
    list,
    addTemporaryConversation,
    removeTemporaryConversation,
    loading,
    handleInputChange,
    searchString,
  };
};
