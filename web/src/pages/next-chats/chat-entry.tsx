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
import { Spin } from '@/components/ui/spin';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useEnsureDefaultChat } from './hooks/use-ensure-default-chat';

/**
 * `/chat` is the host's knowledge-chat entry. It resolves the assistant (the
 * first existing one, or a default created on the spot) and forwards to the
 * conversation detail page, which owns the conversation id.
 */
export default function ChatEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chatId, loading, error, retry } = useEnsureDefaultChat();

  useEffect(() => {
    if (!chatId) {
      return;
    }

    if (!sessionStorage.getItem('x_id_1')) {
      sessionStorage.setItem('x_id_1', chatId);
    }

    navigate(`/chat/${chatId}`, { replace: true });
  }, [chatId, navigate]);

  if (error) {
    return (
      <section className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">{t('chat.loadFailed')}</p>
        <Button onClick={retry}>{t('chat.retry')}</Button>
      </section>
    );
  }

  return (
    <section className="size-full flex items-center justify-center">
      <Spin size="large" spinning={loading || !chatId} />
    </section>
  );
}
