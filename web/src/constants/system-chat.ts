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

// The host platform uses one conversation id for every system-chat request.
export const SystemChatId =
  import.meta.env.VITE_SYSTEM_CHAT_ID || '7b146cf891dc11f085830242ac120005';

export const DefaultServerConfig =
  import.meta.env.VITE_SYSTEM_SERVER_URL || 'https://192.168.0.233:5000';

export const SystemAssistantName =
  import.meta.env.VITE_SYSTEM_ASSISTANT_NAME || '敢为千问';

export const SystemAssistantLlmId =
  import.meta.env.VITE_SYSTEM_ASSISTANT_LLM_ID ||
  'qwq-plus-latest@Tongyi-Qianwen';

export const LoginEmailSuffix =
  import.meta.env.VITE_LOGIN_EMAIL_SUFFIX || '@ganweisoft.com';

export const LoginPassword = import.meta.env.VITE_LOGIN_PASSWORD || 'admin';

export const getSystemChatPrologue = () =>
  (localStorage.getItem('lng') || '').startsWith('zh')
    ? '你好！ 我是你的助理，有什么可以帮到你的吗？'
    : "Hi! I'm your assistant, what can I do for you?";

export const getSystemChatServerConfig = () =>
  (localStorage.getItem('serverConfig') || DefaultServerConfig).replace(
    /\/+$/,
    '',
  );

export const getSystemChatCompletionUrl = () =>
  `${getSystemChatServerConfig()}/v1/conversation/completion`;
