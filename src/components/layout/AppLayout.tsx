import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { DesktopSidebar } from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const CHROME_ROUTES = ['/home', '/train', '/library', '/progress', '/lifestyle', '/nutrition', '/community', '/profile', '/settings', '/referral'];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const showChrome = CHROME_ROUTES.includes(location.pathname);

  if (!showChrome) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <>
        <TopBar />
        <main className="pt-12 pb-[68px]">{children}</main>
        <BottomNav />
      </>
    );
  }

  // Desktop: sidebar layout
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <main className="flex-1 ml-[240px]">{children}</main>
    </div>
  );
};
