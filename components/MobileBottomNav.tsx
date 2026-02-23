import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/src/lib/utils';

interface NavItem {
  id: string;
  name: string;
  icon: string;
  path: string;
}

// Bottom bar is intentionally small (4 main destinations) + a central action + “more”.
// We keep it consistent and "app-like" (floating, blurred, rounded), and fully safe-area aware.
const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', name: 'پیشخوان', icon: 'fa-solid fa-chart-line', path: '/' },
  { id: 'products', name: 'محصولات', icon: 'fa-solid fa-boxes-stacked', path: '/products' },
  { id: 'reports', name: 'گزارشات', icon: 'fa-solid fa-chart-pie', path: '/reports' },
];

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const goQuickAction = () => {
    // Central “primary action” (fast sale). If route changes later, it’s one place to update.
    navigate('/sales/cash');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Floating container */}
      <div className="pointer-events-auto mx-auto w-[min(560px,100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div
          className={cn(
            'relative h-16 rounded-2xl border border-border/70 bg-white/75 dark:bg-gray-900/70',
            'backdrop-blur-xl shadow-lg shadow-black/10 dark:shadow-black/30',
            'px-2'
          )}
        >
          {/* Subtle top highlight */}
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />

          <div className="grid h-full grid-cols-5 items-center">
            {/* Left side items */}
            {BOTTOM_NAV_ITEMS.slice(0, 2).map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive: linkActive }) =>
                  cn(
                    'relative flex h-full flex-col items-center justify-center gap-1 rounded-xl',
                    'transition-colors duration-200',
                    linkActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                {/* Active pill background */}
                <AnimatePresence>
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="bottomNavActivePill"
                      className="absolute inset-x-2 top-2 bottom-2 rounded-xl bg-primary/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative">
                  <i className={cn(item.icon, 'text-[18px]')} />
                </div>
                <span className="relative text-[10px] font-medium leading-none">{item.name}</span>
              </NavLink>
            ))}

            {/* Central primary action */}
            <button
              type="button"
              onClick={goQuickAction}
              className={cn(
                'relative mx-auto h-12 w-12 rounded-2xl',
                'bg-primary text-primary-foreground shadow-md shadow-primary/30',
                'active:scale-95 transition-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              )}
              aria-label="ثبت فروش سریع"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent" />
              <i className="fa-solid fa-plus text-lg" />
            </button>

            {/* Right side items */}
            {BOTTOM_NAV_ITEMS.slice(2, 3).map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive: linkActive }) =>
                  cn(
                    'relative flex h-full flex-col items-center justify-center gap-1 rounded-xl',
                    'transition-colors duration-200',
                    linkActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <AnimatePresence>
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="bottomNavActivePill"
                      className="absolute inset-x-2 top-2 bottom-2 rounded-xl bg-primary/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>

                <div className="relative">
                  <i className={cn(item.icon, 'text-[18px]')} />
                </div>
                <span className="relative text-[10px] font-medium leading-none">{item.name}</span>
              </NavLink>
            ))}

            {/* More / menu */}
            <button
              type="button"
              onClick={onMenuClick}
              className={cn(
                'relative flex h-full flex-col items-center justify-center gap-1 rounded-xl',
                'text-muted-foreground active:scale-95 transition-transform'
              )}
              aria-label="منو"
            >
              <div className="relative">
                <i className="fa-solid fa-bars text-[18px]" />
              </div>
              <span className="text-[10px] font-medium leading-none">بیشتر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
