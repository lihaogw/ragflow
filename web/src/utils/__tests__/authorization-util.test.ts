import { resolveLoginRedirect } from '../authorization-util';

describe('resolveLoginRedirect', () => {
  it('maps the host marker to the chat entry', () => {
    expect(resolveLoginRedirect('?chat')).toBe('/chat');
    expect(resolveLoginRedirect('?systemchat')).toBe('/systemchat');
    expect(resolveLoginRedirect('?serverconfig')).toBe('/serverconfig');
  });

  it('prefers an explicit redirect path', () => {
    expect(resolveLoginRedirect('?redirect=%2Fsystemchat')).toBe('/systemchat');
  });

  it('defaults to the chat entry', () => {
    expect(resolveLoginRedirect('')).toBe('/chat');
  });
});
