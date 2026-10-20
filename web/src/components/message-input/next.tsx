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

'use client';

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
  type FileUploadProps,
} from '@/components/file-upload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/components/hooks/use-mobile';
import {
  CircleStop,
  Globe,
  Paperclip,
  Send,
  Settings2,
  Upload,
  X,
} from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import storage from '@/utils/authorization-util';
import { SelectWithSearch } from '../originui/select-with-search';
import { AudioButton } from '../ui/audio-button';

const VoiceWaveHeights = [10, 30, 50, 30, 10];

export type NextMessageInputOnPressEnterParameter = {
  enableThinking?: string;
  enableInternet?: boolean;
  storeHistoryMessages?: boolean;
  omitSessionId?: boolean;
};

interface NextMessageInputProps {
  disabled: boolean;
  value: string;
  sendDisabled: boolean;
  sendLoading: boolean;
  conversationId: string;
  uploadMethod?: string;
  isShared?: boolean;
  showUploadIcon?: boolean;
  isUploading?: boolean;
  onPressEnter({
    enableThinking,
    enableInternet,
  }: NextMessageInputOnPressEnterParameter): void;
  onInputChange: (
    value: React.ChangeEvent<HTMLTextAreaElement> | string,
  ) => void;
  createConversationBeforeUploadDocument?(message: string): Promise<any>;
  stopOutputMessage?(): void;
  onUpload?: NonNullable<FileUploadProps['onUpload']>;
  removeFile?(file: File): void;
  allowUpload?: boolean;
  showReasoning?: boolean;
  showInternet?: boolean;
  showAudio?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  /** Opt into the host's mobile voice UI (hold to talk + text/voice toggle). */
  enableHostVoice?: boolean;
  /** Mobile-only entry point for session and assistant configuration. */
  onConfigClick?: () => void;
}

export function NextMessageInput({
  isUploading = false,
  value,
  sendDisabled,
  sendLoading,
  disabled,
  showUploadIcon = true,
  resize = 'none',
  onUpload,
  onInputChange,
  stopOutputMessage,
  onPressEnter,
  removeFile,
  allowUpload = true,
  showReasoning = false,
  showInternet = false,
  showAudio = true,
  enableHostVoice = false,
  onConfigClick,
}: NextMessageInputProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const useHostMobileUi = isMobile && enableHostVoice;
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isHoldingVoice, setIsHoldingVoice] = useState(false);
  const [pendingSend, setPendingSend] = useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [audioInputValue, setAudioInputValue] = React.useState<string | null>(
    null,
  );

  const [enableThinking, setEnableThinking] = useState(() =>
    storage.getThinkingLevel(),
  );
  const [enableInternet, setEnableInternet] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ startY: 0, startHeight: 0 });
  const inputChangeRef = useRef(onInputChange);
  const holdingVoiceRef = useRef(false);

  useEffect(() => {
    inputChangeRef.current = onInputChange;
  }, [onInputChange]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const textarea = textareaRef.current;
      if (!textarea) return;
      dragStartRef.current = {
        startY: e.clientY,
        startHeight: textarea.getBoundingClientRect().height,
      };
      setIsManualMode(true);
      setIsResizing(true);
    },
    [],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { startY, startHeight } = dragStartRef.current;
      const delta = startY - e.clientY;
      const newHeight = Math.max(40, Math.min(startHeight + delta, 400));
      textarea.style.height = `${newHeight}px`;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Level 5 is not a deeper step on the same ladder: the backend hands it to
  // the agentic RAG agent, which runs its own retrieval instead of the
  // pipeline's.
  const thinkingOptions = [
    {
      label: t('chat.thinkingLevelAgentic'),
      value: '5',
      description: t('chat.thinkingLevelAgenticDescription'),
    },
    { label: t('chat.thinkingLevelNone'), value: '0' },
  ];

  const handleThinkingChange = useCallback((value: string) => {
    setEnableThinking(value);
    storage.setThinkingLevel(value);
  }, []);

  const handleInternetToggle = useCallback(() => {
    setEnableInternet((prev) => !prev);
  }, []);

  const pressEnter = useCallback(() => {
    onPressEnter({
      enableThinking,
      enableInternet: showInternet ? enableInternet : false,
    });
  }, [onPressEnter, enableThinking, enableInternet, showInternet]);

  const handleVoiceStart = useCallback(() => {
    if (holdingVoiceRef.current) {
      return;
    }
    holdingVoiceRef.current = true;
    window.parent.postMessage({ StartVoice: 'StartVoice' }, '*');
    setIsHoldingVoice(true);
  }, []);

  const handleVoiceEnd = useCallback(() => {
    if (!holdingVoiceRef.current) {
      return;
    }
    holdingVoiceRef.current = false;
    window.parent.postMessage({ StopVoice: 'StopVoice' }, '*');
    setIsHoldingVoice(false);
  }, []);

  const toggleInputMode = useCallback(() => {
    setInputMode((previous) => (previous === 'text' ? 'voice' : 'text'));
  }, []);

  // The host returns a transcript through the bootstrap script.
  useEffect(() => {
    if (!enableHostVoice) {
      return;
    }

    const callback = (text: string) => {
      if (!text) {
        return;
      }
      inputChangeRef.current(text);
      setPendingSend(true);
    };

    window.callbackVoiceXFData = callback;

    return () => {
      if (window.callbackVoiceXFData === callback) {
        delete window.callbackVoiceXFData;
      }
    };
  }, [enableHostVoice]);

  useEffect(() => {
    if (pendingSend && value) {
      pressEnter();
      setPendingSend(false);
    }
  }, [pendingSend, pressEnter, value]);

  useEffect(() => {
    if (audioInputValue !== null) {
      onInputChange({
        target: { value: audioInputValue },
      } as React.ChangeEvent<HTMLTextAreaElement>);

      setTimeout(() => {
        pressEnter();
        setAudioInputValue(null);
      }, 0);
    }
  }, [
    audioInputValue,
    onInputChange,
    onPressEnter,
    enableThinking,
    enableInternet,
    showInternet,
    pressEnter,
  ]);

  const onFileReject = React.useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  const submit = React.useCallback(() => {
    // Mirror the send button's disabled condition so pressing Enter with an
    // empty message does nothing — previously it cleared the uploaded file
    // list without sending anything.
    if (sendDisabled || isUploading || sendLoading || !value.trim()) return;
    pressEnter();
    setFiles([]);
  }, [sendDisabled, isUploading, sendLoading, value, pressEnter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit();
    },
    [submit],
  );

  const handleRemoveFile = React.useCallback(
    (file: File) => () => {
      removeFile?.(file);
    },
    [removeFile],
  );

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      onUpload={onUpload}
      onFileReject={onFileReject}
      className="relative w-full items-center"
      disabled={isUploading || disabled}
    >
      {allowUpload && (
        <FileUploadDropzone
          tabIndex={-1}
          // Prevents the dropzone from triggering on click
          onClick={(event) => event.preventDefault()}
          className="absolute top-0 left-0 z-0 flex size-full items-center justify-center rounded-none border-none bg-background/50 p-0 opacity-0 backdrop-blur transition-opacity duration-200 ease-out data-[dragging]:z-10 data-[dragging]:opacity-100"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center rounded-full border p-2.5">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Drag & drop files here</p>
            <p className="text-muted-foreground text-xs">
              Upload max 5 files each up to 5MB
            </p>
          </div>
        </FileUploadDropzone>
      )}

      <form
        onSubmit={onSubmit}
        className="
          relative flex w-full flex-col gap-2.5 rounded-md
          border-0.5 border-border-default bg-bg-card p-2 outline-none
          has-[textarea:focus]:outline-accent-primary has-[textarea:focus]:outline-1 has-[textarea:focus]:outline-offset-2
        "
      >
        {resize === 'vertical' && (
          <button
            type="button"
            onMouseDown={handleResizeStart}
            aria-label="Drag to resize height"
            className="absolute -top-0.5 left-1/2 z-10 flex h-1 w-12 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full border border-border-default bg-bg-card transition-colors hover:border-accent-primary"
          >
            <span className="h-0.5 w-full rounded-full bg-border-button" />
          </button>
        )}
        {allowUpload && (
          <FileUploadList
            orientation="horizontal"
            className="overflow-x-auto px-0 py-1"
          >
            {files.map((file, index) => (
              <FileUploadItem
                key={index}
                value={file}
                className="max-w-52 p-1.5"
              >
                <FileUploadItemPreview className="size-8 [&>svg]:size-5">
                  <FileUploadItemProgress variant="fill" />
                </FileUploadItemPreview>
                <FileUploadItemMetadata size="sm" />
                <FileUploadItemDelete asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="-top-1 -right-1 absolute size-4 shrink-0 cursor-pointer rounded-full"
                    onClick={handleRemoveFile(file)}
                  >
                    <X className="size-2.5" />
                  </Button>
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>
        )}
        {useHostMobileUi && inputMode === 'voice' ? (
          <div className="flex min-h-10 items-center gap-3">
            <button
              type="button"
              onClick={toggleInputMode}
              aria-label={t('chat.textInput')}
              className="shrink-0"
            >
              <img src="/gw-icon-typing.png" alt="" className="size-8" />
            </button>

            <div className="flex flex-1 flex-col gap-1">
              {isHoldingVoice && (
                <div
                  className="flex h-8 items-center justify-center gap-1"
                  aria-hidden
                >
                  {VoiceWaveHeights.map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="ragflow-voice-wave-bar w-[3px] bg-state-success"
                      style={{
                        height,
                        animationDelay: `${index * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="w-full select-none touch-none"
                onPointerDown={handleVoiceStart}
                onPointerUp={handleVoiceEnd}
                onPointerCancel={handleVoiceEnd}
                onPointerLeave={isHoldingVoice ? handleVoiceEnd : undefined}
              >
                {isHoldingVoice
                  ? t('chat.releaseToSend')
                  : t('chat.holdToTalk')}
              </Button>
            </div>
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            data-testid="chat-textarea"
            value={value}
            onChange={onInputChange}
            placeholder={t('chat.messagePlaceholder')}
            className="
              min-h-10 max-h-[400px] w-full p-0 overflow-auto
              !outline-none !border-transparent !bg-transparent !shadow-none !ring-transparent !ring-offset-transparent
            "
            disabled={isUploading || disabled || sendLoading}
            onKeyDown={handleKeyDown}
            resize={resize === 'vertical' ? 'none' : resize}
            autoSize={isManualMode ? undefined : { minRows: 2, maxRows: 8 }}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {allowUpload && showUploadIcon && !useHostMobileUi && (
              <FileUploadTrigger asChild>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="transparent"
                  className="rounded-sm border-0"
                  disabled={isUploading || sendLoading}
                  data-testid="chat-detail-attach"
                >
                  <Paperclip className="size-3.5" />
                  <span className="sr-only">Attach file</span>
                </Button>
              </FileUploadTrigger>
            )}

            {useHostMobileUi && inputMode === 'text' && (
              <Button
                type="button"
                variant="transparent"
                size="icon-xs"
                className="border-0"
                onClick={toggleInputMode}
                aria-label={t('chat.voiceInput')}
              >
                <img src="/gw-icon-voice.png" alt="" className="size-5" />
              </Button>
            )}

            {isMobile && onConfigClick && (
              <Button
                type="button"
                variant="transparent"
                size="icon-xs"
                className="gap-1 border-0"
                onClick={onConfigClick}
              >
                <Settings2 className="size-3.5" />
                <span>{t('chat.config')}</span>
              </Button>
            )}

            {showReasoning && (
              <SelectWithSearch
                value={enableThinking}
                options={thinkingOptions}
                onChange={handleThinkingChange}
                triggerClassName="h-7 border-0 !bg-bg-card text-sm"
                testId="chat-detail-thinking-toggle"
              />
            )}

            {showInternet && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={enableInternet ? 'accent' : 'transparent'}
                    size="icon-xs"
                    className="border-0"
                    onClick={handleInternetToggle}
                    data-testid="chat-detail-internet-toggle"
                  >
                    <Globe />
                    <span className="sr-only">{t('chat.webSearch')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('chat.webSearch')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {sendLoading ? (
            <Button
              data-testid="chat-stream-status"
              onClick={stopOutputMessage}
              size="icon-xs"
            >
              <CircleStop />
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {showAudio && !useHostMobileUi && (
                <AudioButton
                  onOk={(value) => {
                    setAudioInputValue(value);
                  }}
                  testId="chat-detail-audio-toggle"
                />
              )}

              <Button
                size="icon-xs"
                disabled={
                  sendDisabled || isUploading || sendLoading || !value.trim()
                }
                data-testid="chat-detail-send"
              >
                <Send />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          )}
        </div>
      </form>
    </FileUpload>
  );
}
