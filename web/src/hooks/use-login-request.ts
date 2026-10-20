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

import message from '@/components/ui/message';
import { Authorization } from '@/constants/authorization';
import userService, { loginWithChannel } from '@/services/user-service';
import {
  default as authorizationUtil,
  redirectToLogin,
  default as storage,
} from '@/utils/authorization-util';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSaveSetting } from './use-user-setting-request';

export interface ILoginRequestBody {
  email: string;
  password: string;
}

export interface IRegisterRequestBody extends ILoginRequestBody {
  nickname: string;
}

export interface ILoginChannel {
  channel: string;
  display_name: string;
  icon: string;
}

export const useLoginChannels = () => {
  // The host platform signs users in with the account it passes in the URL;
  // third-party SSO channels stay disabled.
  return { channels: [] as ILoginChannel[], loading: false };
};

export const useLoginWithChannel = () => {
  const { isPending: loading, mutateAsync } = useMutation({
    mutationKey: ['loginWithChannel'],
    mutationFn: async (channel: string) => {
      loginWithChannel(channel);
      return Promise.resolve();
    },
  });

  return { loading, login: mutateAsync };
};

export const useLogin = () => {
  const { saveSetting } = useSaveSetting(true);
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['login'],
    mutationFn: async (params: { email: string; password: string }) => {
      const { data: res = {}, response } = await userService.login(params);
      if (res.code === 0) {
        // The language is based on the .lng stored in the client's local storage.
        // The language stored in the database is for agent template resources,
        // since the agent template resources are stored on the server.
        saveSetting({ language: storage.getLanguage() });
        const { data } = res;
        // The platform display name is authoritative in the host UI.
        const hostNickname = sessionStorage.getItem('emString');
        if (hostNickname) {
          data.nickname = hostNickname;
        }
        const authorization = response.headers.get(Authorization);
        const token = data.access_token;
        const userInfo = {
          avatar: data.avatar,
          name: data.nickname,
          email: data.email,
        };
        authorizationUtil.setItems({
          Authorization: authorization,
          userInfo: JSON.stringify(userInfo),
          Token: token,
        });
      }
      return res.code;
    },
  });

  return { data, loading, login: mutateAsync };
};

export const useRegister = () => {
  const { t } = useTranslation();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['register'],
    mutationFn: async (params: {
      email: string;
      password: string;
      nickname: string;
    }) => {
      const { data = {} } = await userService.register(params);
      if (data.code === 0) {
        message.success(t('message.registered'));
      } else if (
        data.message &&
        data.message.includes('registration is disabled')
      ) {
        message.error(
          t('message.registerDisabled') || 'User registration is disabled',
        );
      }
      return data.code;
    },
  });

  return { data, loading, register: mutateAsync };
};

export const useLogout = () => {
  const { t } = useTranslation();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['logout'],
    mutationFn: async () => {
      const { data = {} } = await userService.logout();
      if (data.code === 0) {
        message.success(t('message.logout'));
        authorizationUtil.removeAll();
        // A later standalone visit to /login must show the form instead of
        // reusing the host identity from this tab.
        sessionStorage.removeItem('hostLogin');
        sessionStorage.removeItem('emString');
        localStorage.removeItem('emString');
        redirectToLogin();
      }
      return data.code;
    },
  });

  return { data, loading, logout: mutateAsync };
};
