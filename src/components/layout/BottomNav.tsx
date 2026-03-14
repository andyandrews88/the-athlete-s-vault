import { NavLink, useLocation } from 'react-router-dom';
import { Home, Dumbbell, BookOpen, TrendingUp, MoreHorizontal } from 'lucide-react';

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/train', label: 'Train', icon: Dumbbell },
  { path: '/library', label: 'Library', icon: BookOpen },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/more', label: 'More', icon: MoreHorizontal },
];

const VISIBLE_ROUTES = ['/home', '/train', '/library', '/progress', '/more'];

export const BottomNav = () => {
  const location = useLocation();
  if (!VISIBLE_ROUTES.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] z-50 px-4 flex items-center justify-around"
      style={{
        background: 'hsl(var(--bg))',
        borderTop: '1px solid hsl(var(--border))',
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium tracking-wider">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
