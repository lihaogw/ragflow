import { useIsMobile } from '@/components/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { DesktopNavbar } from './global-navbar';

/**
 * The host UI keeps only the two chat entries, anchored at the top-right.
 * Mobile shells hide the header entirely.
 */
export function Header({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <header
      className={cn(
        'absolute right-5 top-0 z-10 flex items-center px-5 py-4',
        className,
      )}
      {...props}
    >
      <DesktopNavbar />
    </header>
  );
}
