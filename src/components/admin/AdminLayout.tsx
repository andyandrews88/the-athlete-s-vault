import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Dumbbell, BookOpen, BarChart2, MessageSquare, ArrowLeft } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/clients', label: 'Clients', icon: Users },
  { path: '/admin/workout-builder', label: 'Workout Builder', icon: Dumbbell },
  { path: '/admin/library', label: 'Library & AI', icon: BookOpen },
  { path: '/admin/business', label: 'Business', icon: BarChart2 },
  { path: '/community', label: 'Community', icon: MessageSquare },
];

const isActive = (current: string, item: typeof navItems[0]) => {
  if (item.exact) return current === item.path;
  return current.startsWith(item.path);
};

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg))' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: 220, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
          flexDirection: 'column', background: 'hsl(var(--bg2))',
          borderRight: '1px solid hsl(var(--border))',
        }}
      >
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: 'hsl(var(--primary))', letterSpacing: '0.06em' }}>THE VAULT</div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: 6,
            background: 'hsl(var(--warn) / 0.15)', color: 'hsl(var(--warn))',
          }}>ADMIN</span>
        </div>

        <nav style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const active = isActive(location.pathname, item);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', margin: '0 8px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
                  background: active ? 'hsl(var(--pgb))' : 'transparent',
                  color: active ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
                  transition: 'background 0.15s',
                }}
              >
                <item.icon size={18} style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--dim))' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '8px 0 16px' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', margin: '0 8px', borderRadius: 8,
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'hsl(var(--dim))',
            }}
          >
            <ArrowLeft size={18} style={{ color: 'hsl(var(--dim))' }} />
            Back to App
          </button>
        </div>
      </aside>

      {/* Mobile top strip */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 48, zIndex: 40,
          background: 'hsl(var(--bg2))', borderBottom: '1px solid hsl(var(--border))',
          alignItems: 'center', overflowX: 'auto', gap: 0, paddingLeft: 4, paddingRight: 4,
        }}
      >
        {navItems.map((item) => {
          const active = isActive(location.pathname, item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', borderRadius: 8,
                background: 'transparent',
                color: active ? 'hsl(var(--primary))' : 'hsl(var(--dim))',
              }}
            >
              <item.icon size={20} />
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/home')}
          style={{
            width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', borderRadius: 8,
            background: 'transparent', color: 'hsl(var(--dim))',
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="md:ml-[220px]" style={{ flex: 1 }}>
        <div className="mt-[48px] md:mt-0">
          {children}
        </div>
      </div>
    </div>
  );
};
