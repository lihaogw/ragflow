import { Outlet, useLocation } from 'react-router';
import { Routes } from '@/routes';
import { Header } from './components/header';

const HeaderRoutes = [Routes.Chat, Routes.SystemChat];

const matchesPath = (pathname: string, candidate: string) =>
  pathname === candidate || pathname.startsWith(`${candidate}/`);

export function RootLayoutContainer({ children }: React.PropsWithChildren) {
  const { pathname } = useLocation();
  const showHeader = HeaderRoutes.some((route) => matchesPath(pathname, route));

  return (
    <div className="relative size-full min-w-0 overflow-hidden">
      {showHeader && <Header />}

      <main className="size-full min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}

export default function RootLayout() {
  return (
    <RootLayoutContainer>
      <Outlet />
    </RootLayoutContainer>
  );
}
