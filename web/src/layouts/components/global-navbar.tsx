import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { LucideMessagesSquare } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { supportsCssAnchor } from '@/utils/css-support';

const PathMap = {
  [Routes.SystemChat]: [Routes.SystemChat],
  [Routes.Chat]: [Routes.Chat],
} as const;

// Match on path-segment boundaries, not a loose substring, so e.g.
// "/user-setting/chat-channel" does not match the "/chat" tab.
const matchesPath = (pathname: string, candidate: string) =>
  pathname === candidate || pathname.startsWith(`${candidate}/`);

const menuItems = [
  {
    path: Routes.SystemChat,
    name: 'header.systemChat',
    icon: LucideMessagesSquare,
    'data-testid': 'nav-system-chat',
  },
  {
    path: Routes.Chat,
    name: 'header.chat',
    icon: LucideMessagesSquare,
    'data-testid': 'nav-chat',
  },
];

function useActivePath() {
  const { pathname } = useLocation();

  return useMemo(() => {
    return (
      Object.keys(PathMap).find((x: string) =>
        PathMap[x as keyof typeof PathMap].some((y: string) =>
          matchesPath(pathname, y),
        ),
      ) || pathname
    );
  }, [pathname]);
}

const DesktopNavbarWithAnchor = () => {
  const { t } = useTranslation();
  const activePath = useActivePath();
  const navbarAnchorNamePrefix = useId().replace(/:/g, '');

  const activePathAnchorName = `--${navbarAnchorNamePrefix}${activePath === Routes.Root ? '-root' : activePath.replace('/', '-')}`;

  const hasAnyActive = useMemo(
    () => menuItems.some(({ path }) => path === activePath),
    [activePath],
  );

  return (
    <nav>
      <ul className="relative flex items-center p-1 bg-bg-card rounded-full border border-border-button">
        {menuItems.map(({ path, name, icon: Icon, ...props }) => {
          const isActive = path === activePath;
          const anchorName = `--${navbarAnchorNamePrefix}${path === Routes.Root ? '-root' : path.replace('/', '-')}`;

          return (
            <li key={path} className="relative" style={{ anchorName }}>
              <Link
                {...props}
                to={path}
                className={cn(
                  'h-10 px-4 xl:px-6 text-sm xl:text-base inline-flex items-center justify-center whitespace-nowrap',
                  'hover:text-current focus-visible:text-current rounded-full transition-all',
                  isActive && '!text-bg-base',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4" />
                <span>{t(name)}</span>
              </Link>
            </li>
          );
        })}

        <li
          className={cn(
            'absolute -z-[1] bg-text-primary border-b-2 border-b-accent-primary rounded-full opacity-0',
            'transition-all',
            hasAnyActive && 'opacity-100',
          )}
          role="presentation"
          style={{
            top: 'anchor(top)',
            left: 'anchor(left)',
            width: 'anchor-size(width)',
            height: 'anchor-size(height)',
            positionAnchor: activePathAnchorName,
          }}
        />
      </ul>
    </nav>
  );
};

const DesktopNavbarFallback = () => {
  const { t } = useTranslation();
  const activePath = useActivePath();

  return (
    <nav>
      <ul className="flex items-center p-1 bg-bg-card rounded-full border border-border-button">
        {menuItems.map(({ path, name, icon: Icon, ...props }) => {
          const isActive = path === activePath;

          return (
            <li key={path}>
              <Link
                {...props}
                to={path}
                className={cn(
                  'h-10 px-4 xl:px-6 text-sm xl:text-base inline-flex items-center justify-center whitespace-nowrap',
                  'hover:text-current focus-visible:text-current rounded-full transition-all',
                  isActive &&
                    '!text-bg-base bg-text-primary border-b-2 border-b-accent-primary',
                )}
                aria-label={t(name)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4" />
                <span>{t(name)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export function DesktopNavbar() {
  return supportsCssAnchor ? (
    <DesktopNavbarWithAnchor />
  ) : (
    <DesktopNavbarFallback />
  );
}

const GlobalNavbar = DesktopNavbar;

export default GlobalNavbar;
