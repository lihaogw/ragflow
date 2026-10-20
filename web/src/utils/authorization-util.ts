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

import {
  Authorization,
  ThinkingLevel,
  Token,
  UserInfo,
} from '@/constants/authorization';
import { getSearchValue } from './common-util';
const KeySet = [Authorization, Token, UserInfo];

const storage = {
  getAuthorization: () => {
    return localStorage.getItem(Authorization);
  },
  getToken: () => {
    return localStorage.getItem(Token);
  },
  getUserInfo: () => {
    return localStorage.getItem(UserInfo);
  },
  getUserInfoObject: () => {
    const userInfoStr = localStorage.getItem(UserInfo);
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  },
  setAuthorization: (value: string) => {
    localStorage.setItem(Authorization, value);
  },
  setToken: (value: string) => {
    localStorage.setItem(Token, value);
  },
  setUserInfo: (value: string | Record<string, unknown>) => {
    const valueStr = typeof value !== 'string' ? JSON.stringify(value) : value;
    localStorage.setItem(UserInfo, valueStr);
  },
  setItems: (pairs: Record<string, string>) => {
    Object.entries(pairs).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  },
  removeAuthorization: () => {
    localStorage.removeItem(Authorization);
  },
  removeAll: () => {
    KeySet.forEach((x) => {
      localStorage.removeItem(x);
    });
  },
  setLanguage: (lng: string) => {
    localStorage.setItem('lng', lng);
  },
  getLanguage: (): string => {
    return localStorage.getItem('lng') as string;
  },
  setThinkingLevel: (level: string) => {
    localStorage.setItem(ThinkingLevel, level);
  },
  // Only Naive (0) and Agentic (5) are offered; a level persisted by a
  // since-removed option falls back to the Naive default rather than reaching
  // the request as NaN.
  getThinkingLevel: (): string => {
    const level = localStorage.getItem(ThinkingLevel);
    return level === '0' || level === '5' ? level : '0';
  },
};

export const getAuthorization = () => {
  const auth = getSearchValue('auth');
  const authorization = auth
    ? 'Bearer ' + auth
    : storage.getAuthorization() || '';

  return authorization;
};

export default storage;

const AppBase = (import.meta.env.VITE_BASE_URL || '/').replace(/\/+$/, '');

const withAppBase = (path: string) => `${AppBase}${path}`;

// Routes the host platform may ask the login page to return to. The `?chat`
// form is the contract used by the host's entry links.
const LoginRouteMap: Record<string, string> = {
  chat: '/chat',
  knowledge: '/datasets',
  systemchat: '/systemchat',
  serverconfig: '/serverconfig',
  search: '/searches',
};

export function resolveLoginRedirect(search: string = location.search) {
  // The host's mobile shell always resumes in the chat page.
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 767px)').matches
  ) {
    return '/chat';
  }

  const params = new URLSearchParams(search);
  const redirect = params.get('redirect');

  if (redirect?.startsWith('/')) {
    // `location.pathname` includes the deployment base; router paths do not.
    return AppBase && redirect.startsWith(`${AppBase}/`)
      ? redirect.slice(AppBase.length)
      : redirect;
  }

  const matchedRoute = Object.keys(LoginRouteMap).find((key) =>
    params.has(key),
  );

  return matchedRoute ? LoginRouteMap[matchedRoute] : '/chat';
}

// Will not jump to the login page
export function redirectToLogin() {
  const loginUrl = withAppBase('/login');

  if (location.pathname.startsWith(loginUrl)) {
    window.location.href = location.origin + loginUrl;
    return;
  }

  const currentUrl = `${location.pathname}${location.search}${location.hash}`;

  window.location.href =
    location.origin + `${loginUrl}?redirect=${encodeURIComponent(currentUrl)}`;
}
