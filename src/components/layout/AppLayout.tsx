import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { DesktopSidebar } from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const CHROME_ROUTES = ['/home', '/train', '/library', '/progress', '/lifestyle', '/nutrition', '/community', '/profile', '/settings', '/referral'];

const ADMIN_TABS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/clients', label: 'Clients' },
  { path: '/admin/workout-builder', label: 'Builder' },
  { path: '/admin/business', label: 'Business' },
];

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const showChrome = CHROME_ROUTES.includes(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Mobile admin layout
  if (isAdminRoute && isMobile) {
    return (
      <>
        <TopBar />
        <div
          className="fixed top-12 left-0 right-0 z-30 overflow-x-auto"
          style={{
            background: 'hsl(var(--bg))',
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          <div className="flex px-3 py-2 gap-2" style={{ minWidth: 'max-content' }}>
            {ADMIN_TABS.map(tab => {
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className="shrink-0 rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors"
                  style={{
                    background: isActive ? 'hsl(var(--primary))' : 'transparent',
                    color: isActive ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <main className="pt-[88px] pb-[80px] px-0">{children}</main>
        <BottomNav />
      </>
    );
  }

  if (!showChrome && !isAdminRoute) {
    return <>{children}</>;
  }

  if (!showChrome && isAdminRoute) {
    // Desktop admin — no chrome wrapper, just render children
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
