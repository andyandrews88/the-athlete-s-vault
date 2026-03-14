import { NavLink, useLocation } from 'react-router-dom';
import { Home, Dumbbell, Leaf, Apple, TrendingUp } from 'lucide-react';

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/train', label: 'Train', icon: Dumbbell },
  { path: '/lifestyle', label: 'Lifestyle', icon: Leaf },
  { path: '/nutrition', label: 'Nutrition', icon: Apple },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
];

const VISIBLE_ROUTES = ['/home', '/train', '/lifestyle', '/nutrition', '/progress', '/library', '/community'];

export const BottomNav = () => {
  const location = useLocation();
  if (!VISIBLE_ROUTES.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] z-50 px-4 flex items-center justify-around"
      style={{
        background: 'hsla(220,16%,8%,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(var(--border))',
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
              isActive ? 'bg-vault-pgb text-primary' : 'text-vault-dim'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] font-medium uppercase tracking-wider">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
