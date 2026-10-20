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

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useFetchChat } from '@/hooks/use-chat-request';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ChatSettings } from './app-settings/chat-settings';
import { Sessions } from './sessions';

type MobileChatConfigProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleConversationCardClick: (conversationId: string, isNew: boolean) => void;
};

/**
 * Mobile replacement for the desktop session sidebar and settings panel:
 * the host shell shows one chat step, and this sheet keeps both the
 * conversation list (with rename/delete/batch actions) and the full assistant
 * settings reachable.
 */
export function MobileChatConfig({
  open,
  onOpenChange,
  handleConversationCardClick,
}: MobileChatConfigProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: chat } = useFetchChat();
  const [activeTab, setActiveTab] = useState<'sessions' | 'settings'>(
    'sessions',
  );

  const showSessionsTab = useCallback(() => setActiveTab('sessions'), []);
  const showSettingsTab = useCallback(() => setActiveTab('settings'), []);
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleSwitchAssistant = useCallback(() => {
    onOpenChange(false);
    navigate('/chats');
  }, [navigate, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col gap-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-left">
            {chat?.name || t('chat.chatApps')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'sessions' ? 'accent' : 'ghost'}
              onClick={showSessionsTab}
            >
              {t('chat.conversations')}
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'accent' : 'ghost'}
              onClick={showSettingsTab}
            >
              {t('chat.chatSetting')}
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleSwitchAssistant}>
            {t('chat.switchAssistant')}
          </Button>
        </div>

        {activeTab === 'sessions' ? (
          <Sessions
            hideToggle
            className="flex-1 min-h-0"
            handleConversationCardClick={handleConversationCardClick}
            onConversationSelected={handleClose}
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatSettings hasSingleChatBox alwaysVisible />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
