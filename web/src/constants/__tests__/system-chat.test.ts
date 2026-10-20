import {
  DefaultServerConfig,
  getSystemChatCompletionUrl,
  getSystemChatServerConfig,
  SystemChatId,
} from '../system-chat';

describe('system chat host contract', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('uses the fixed conversation id', () => {
    expect(SystemChatId).toBe('7b146cf891dc11f085830242ac120005');
  });

  it('targets the host completion endpoint and trims trailing slashes', () => {
    localStorage.setItem('serverConfig', 'https://host.example:5000/');

    expect(getSystemChatServerConfig()).toBe('https://host.example:5000');
    expect(getSystemChatCompletionUrl()).toBe(
      'https://host.example:5000/v1/conversation/completion',
    );
  });

  it('falls back to the configured default server', () => {
    expect(getSystemChatServerConfig()).toBe(
      DefaultServerConfig.replace(/\/+$/, ''),
    );
  });
});
