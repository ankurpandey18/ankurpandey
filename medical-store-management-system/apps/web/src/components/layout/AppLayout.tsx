import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronRight,
  ShieldCheck,
  Package,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cn, getInitials, formatRoleName } from '../../utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: string[];
  disabled?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: 'Employees',
    to: '/employees',
    icon: <Users className="w-4 h-4" />,
    roles: ['OWNER'],
  },
  {
    label: 'Audit Logs',
    to: '/audit',
    icon: <ClipboardList className="w-4 h-4" />,
    roles: ['OWNER'],
  },
  // Future modules — clearly marked as coming soon
  {
    label: 'Inventory',
    to: '#',
    icon: <Package className="w-4 h-4" />,
    disabled: true,
    badge: 'Phase 2',
  },
  {
    label: 'Billing',
    to: '#',
    icon: <Receipt className="w-4 h-4" />,
    disabled: true,
    badge: 'Phase 2',
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      error('Logout failed', 'Please try again');
    }
  };

  const visibleNav = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-navy-900">MedStore Pro</span>
          <p className="text-xs text-slate-500">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {visibleNav.map((item) =>
            item.disabled ? (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                           text-slate-400 cursor-not-allowed select-none"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  cn('sidebar-item', isActive && 'active')
                }
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-3 h-3 opacity-30" />
              </NavLink>
            ),
          )}
        </div>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-100 p-3">
        <NavLink
          to="/profile"
          className={({ isActive }) => cn('sidebar-item', isActive && 'active')}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">
              {user?.role ? formatRoleName(user.role) : ''}
            </p>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full mt-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 bg-white border-r border-slate-200 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Mobile navigation"
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white border-b border-slate-200 flex items-center px-4 h-14 flex-shrink-0 shadow-sm">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 mr-3"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Profile link */}
          <NavLink
            to="/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-700 leading-none">{user?.name}</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">
                {user?.role ? formatRoleName(user.role) : ''}
              </p>
            </div>
          </NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
