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

import MessageItem from '@/components/message-item';
import { NextMessageInput } from '@/components/message-input/next';
import message from '@/components/ui/message';
import { MessageType } from '@/constants/chat';
import {
  getSystemChatPrologue,
  SystemAssistantName,
  SystemChatId,
} from '@/constants/system-chat';
import {
  useHandleMessageInputChange,
  useScrollToBottom,
} from '@/hooks/logic-hooks';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { EmptyReference } from '@/pages/next-chats/utils';
import { buildMessageUuidWithRole } from '@/utils/chat';
import { isEmpty } from 'lodash';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemChat } from './use-system-chat';

export default function SystemChat() {
  const { t } = useTranslation();
  const { messages, isStreaming, sendMessage, stopOutputMessage } =
    useSystemChat();
  const { handleInputChange, value, setValue } = useHandleMessageInputChange();
  const { data: userInfo } = useFetchUserInfo();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { scrollRef } = useScrollToBottom(messages, messageContainerRef);

  // The rest of the app checks these markers to enter the system-chat UI
  // (no uploads, no feedback/prompt actions).
  useEffect(() => {
    localStorage.objId = SystemChatId;
    localStorage.objName = SystemAssistantName;
    localStorage.tips = getSystemChatPrologue();
    window.parent.postMessage({ voiceInit: 'voiceInit' }, '*');

    return () => {
      localStorage.objId = '';
      localStorage.objName = '';
      localStorage.tips = '';
    };
  }, []);

  const handlePressEnter = useCallback(async () => {
    if (!value.trim() || isStreaming) {
      return;
    }

    const question = value;
    setValue('');

    const status = await sendMessage(question);

    if (status === 'failed') {
      setValue(question);
      message.error(t('chat.loadFailed'));
    }
  }, [isStreaming, sendMessage, setValue, t, value]);

  const sendDisabled = useMemo(() => isEmpty(value.trim()), [value]);

  return (
    <section className="h-full flex flex-col pt-0 md:pt-20">
      <div
        ref={messageContainerRef}
        className="p-5 flex-1 overflow-auto min-h-0 scrollbar-auto"
      >
        <div className="w-full pr-5">
          {messages.map((item, index) => (
            <MessageItem
              loading={
                item.role === MessageType.Assistant &&
                isStreaming &&
                messages.length - 1 === index
              }
              key={buildMessageUuidWithRole(item)}
              item={item}
              nickname={userInfo.nickname}
              avatar={userInfo.avatar}
              reference={EmptyReference}
              index={index}
              showLikeButton={false}
              showLoudspeaker={false}
              sendLoading={isStreaming}
            />
          ))}
        </div>
        <div ref={scrollRef} />
      </div>

      <div className="p-5 pt-0">
        <NextMessageInput
          disabled={false}
          sendDisabled={sendDisabled}
          sendLoading={isStreaming}
          value={value}
          resize="vertical"
          onInputChange={handleInputChange}
          onPressEnter={handlePressEnter}
          conversationId={SystemChatId}
          stopOutputMessage={stopOutputMessage}
          allowUpload={false}
          showUploadIcon={false}
          showAudio={false}
          enableHostVoice
        />
      </div>
    </section>
  );
}
