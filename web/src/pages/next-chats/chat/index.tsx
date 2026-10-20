import { useIsMobile } from '@/components/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useFetchSessionList,
  useFetchSessionManually,
  useGetChatSearchParams,
} from '@/hooks/use-chat-request';
import { IClientConversation } from '@/interfaces/database/chat';
import { RootLayoutContainer } from '@/layouts/root-layout';
import { cn } from '@/lib/utils';
import { generateConversationId } from '@/utils/chat';
import { isEmpty } from 'lodash';
import { LucideArrowBigLeft, LucideArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatUrlParams } from '../hooks/use-chat-url';
import { useHandleClickConversationCard } from '../hooks/use-click-card';
import { ChatSettings } from './app-settings/chat-settings';
import { MultipleChatBox } from './chat-box/next-multiple-chat-box';
import { SingleChatBox } from './chat-box/single-chat-box';
import { MobileChatConfig } from './mobile-chat-config';
import { useAddChatBox } from './use-add-box';
import { useSwitchDebugMode } from './use-switch-debug-mode';

export default function Chat() {
  const { t } = useTranslation();
  const [currentConversation, setCurrentConversation] =
    useState<IClientConversation>({} as IClientConversation);

  const { fetchSessionManually } = useFetchSessionManually();

  const { handleConversationCardClick, controller, stopOutputMessage } =
    useHandleClickConversationCard();

  const { isDebugMode, switchDebugMode } = useSwitchDebugMode();
  const { removeChatBox, addChatBox, chatBoxIds, hasSingleChatBox } =
    useAddChatBox(isDebugMode);

  const { conversationId, isNew } = useGetChatSearchParams();

  const { data: dialogList, loading: sessionListLoading } =
    useFetchSessionList();
  const { setConversationBoth } = useChatUrlParams();
  const isMobile = useIsMobile();
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const autoSelectedSessionRef = useRef(false);
  const handleOpenMobileConfig = useCallback(() => {
    setMobileConfigOpen(true);
  }, []);

  // Entering the knowledge chat leaves system-chat mode behind and tells the
  // host that a voice-capable input is now on screen.
  useEffect(() => {
    localStorage.objId = '';
    localStorage.objName = '';
    localStorage.tips = '';
    window.parent.postMessage({ voiceInit: 'voiceInit' }, '*');
  }, []);

  // The host opens /chat/:id without a conversation id. Select the newest
  // conversation, or start a temporary one that the first message persists.
  useEffect(() => {
    if (
      conversationId ||
      sessionListLoading ||
      autoSelectedSessionRef.current
    ) {
      return;
    }

    autoSelectedSessionRef.current = true;

    if (dialogList.length > 0) {
      setConversationBoth(dialogList[0].id, '');
    } else {
      setConversationBoth(generateConversationId(), 'true');
    }
  }, [conversationId, dialogList, sessionListLoading, setConversationBoth]);

  useEffect(() => {
    if (conversationId && !sessionStorage.getItem('x_id_2')) {
      sessionStorage.setItem('x_id_2', conversationId);
    }
  }, [conversationId]);

  const currentConversationName = useMemo(() => {
    return (
      dialogList.find((x) => x.id === conversationId)?.name ||
      t('chat.newConversation')
    );
  }, [conversationId, dialogList, t]);

  // The URL is the single source of truth for which conversation is open:
  // card clicks, "+" and the temp→real id swap after the first send all land
  // here. Clear first so the previous conversation's messages and references
  // can never leak into the newly opened one while the fetch is in flight.
  useEffect(() => {
    setCurrentConversation((previous) =>
      isEmpty(previous) ? previous : ({} as IClientConversation),
    );
    if (!conversationId || isNew === 'true') return;

    let cancelled = false;
    fetchSessionManually(conversationId).then((conversation) => {
      if (!cancelled && !isEmpty(conversation)) {
        setCurrentConversation(conversation);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, isNew, fetchSessionManually]);

  if (isDebugMode) {
    return (
      <section
        className="pt-5 md:pt-20 pb-14 h-[100vh] flex flex-col"
        data-testid="chat-detail-multimodel-root"
      >
        <header className="px-10 pb-5">
          <div className="mb-5">
            <Button
              variant="outline"
              onClick={switchDebugMode}
              data-testid="chat-detail-multimodel-back"
            >
              <LucideArrowBigLeft />
              <span>{t('common.back')}</span>
            </Button>
          </div>

          <span className="text-2xl">
            {t('chat.multipleModels')} ({chatBoxIds.length}/3)
          </span>
        </header>

        <MultipleChatBox
          chatBoxIds={chatBoxIds}
          controller={controller}
          removeChatBox={removeChatBox}
          addChatBox={addChatBox}
          stopOutputMessage={stopOutputMessage}
          conversation={currentConversation}
        ></MultipleChatBox>
      </section>
    );
  }

  return (
    <RootLayoutContainer>
      <section
        className="h-full flex flex-col pt-0 md:pt-20"
        data-testid="chat-detail"
      >
        <article className="flex flex-1 min-h-0 pb-9">
          <Card className="flex-1 min-w-0 bg-transparent border-none shadow-none h-full">
            <CardContent className="flex p-0 h-full">
              <Card className="flex flex-col flex-1 bg-transparent min-w-0 overflow-hidden">
                <CardHeader
                  className={cn('p-5', {
                    'border-b-0.5 border-border-button': hasSingleChatBox,
                  })}
                >
                  <CardTitle className="flex justify-between items-center text-base gap-2">
                    <div className="truncate">{currentConversationName}</div>

                    <Button
                      variant="ghost"
                      onClick={switchDebugMode}
                      data-testid="chat-detail-multimodel-toggle"
                    >
                      <LucideArrowUpRight />
                      {t('chat.multipleModels')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 min-h-0">
                  <SingleChatBox
                    conversation={currentConversation}
                    onConfigClick={handleOpenMobileConfig}
                  />
                </CardContent>
              </Card>

              {!isMobile && (
                <ChatSettings
                  hasSingleChatBox={hasSingleChatBox}
                ></ChatSettings>
              )}
            </CardContent>
          </Card>
        </article>
      </section>

      {isMobile && (
        <MobileChatConfig
          open={mobileConfigOpen}
          onOpenChange={setMobileConfigOpen}
          handleConversationCardClick={handleConversationCardClick}
        />
      )}
    </RootLayoutContainer>
  );
}
