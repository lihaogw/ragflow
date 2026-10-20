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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import message from '@/components/ui/message';
import { DefaultServerConfig } from '@/constants/system-chat';
import { RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ServerConfig() {
  const { t } = useTranslation();
  const [serverConfig, setServerConfig] = useState(
    () => localStorage.getItem('serverConfig') || DefaultServerConfig,
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setServerConfig(nextValue);
      localStorage.setItem('serverConfig', nextValue);
    },
    [],
  );

  const resetConfig = useCallback(() => {
    localStorage.setItem('serverConfig', DefaultServerConfig);
    setServerConfig(DefaultServerConfig);
    message.success(t('serverConfig.resetSuccess'));
  }, [t]);

  const defaultOrigin = useMemo(() => {
    try {
      const defaultUrl = new URL(DefaultServerConfig);
      // The host root is reached without the API port; this link exists so
      // field engineers can open the host page (and trust its certificate).
      return `${defaultUrl.protocol}//${defaultUrl.hostname}`;
    } catch {
      return DefaultServerConfig;
    }
  }, []);

  return (
    <section className="size-full flex items-center justify-center p-10">
      <Card className="w-full max-w-[600px]">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {t('serverConfig.title')}
          </CardTitle>
          <CardDescription>{t('serverConfig.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Input
            value={serverConfig}
            onChange={handleInputChange}
            placeholder={t('serverConfig.inputPlaceholder')}
            aria-label={t('serverConfig.title')}
          />

          <div className="space-y-3">
            <p className="font-medium">
              {t('serverConfig.quickAccess')}
              <span className="ml-1 font-normal text-text-secondary">
                {t('serverConfig.insecureProtocol')}
              </span>
            </p>

            <a
              className="block text-accent-primary break-all"
              href={serverConfig || DefaultServerConfig}
              target="_blank"
              rel="noopener noreferrer"
            >
              {serverConfig || DefaultServerConfig}
            </a>

            <a
              className="block text-accent-primary break-all"
              href={defaultOrigin}
              target="_blank"
              rel="noopener noreferrer"
            >
              {defaultOrigin}
            </a>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={resetConfig}>
              <RotateCcw className="size-4" />
              {t('serverConfig.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
