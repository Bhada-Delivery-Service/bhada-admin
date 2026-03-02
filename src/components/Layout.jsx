import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Bike, ShieldCheck, Tag, BadgePercent,
  Navigation,
  AlertTriangle, CreditCard, LogOut, Menu, X, Bell,
  IndianRupee, ArrowDownToLine, MapPin, UserCircle, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from '../components/NotificationPanel';
import toast from 'react-hot-toast';

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/orders',   icon: Package,        label: 'Orders' },
      { to: '/riders',   icon: Bike,           label: 'Riders' },
      { to: '/users',    icon: Users,          label: 'Users' },
      { to: '/tracking', icon: Navigation,      label: 'Live Tracking' },
      { to: '/disputes', icon: AlertTriangle,  label: 'Disputes' },
      { to: '/service-areas', icon: MapPin,    label: 'Service Areas' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/earnings',          icon: IndianRupee,      label: 'Rider Earnings' },
      { to: '/withdrawals',       icon: ArrowDownToLine,  label: 'Withdrawals' },
      { to: '/security-deposits', icon: ShieldCheck,  label: 'Security Deposits' },
      { to: '/handling-charges',  icon: IndianRupee,  label: 'Handling Charges' },
      { to: '/payments',          icon: CreditCard,       label: 'Payments' },
      { to: '/pricing',           icon: BadgePercent,     label: 'Pricing' },
      { to: '/offers',            icon: Tag,              label: 'Offers' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admins',  icon: ShieldCheck,  label: 'Admins' },
      { to: '/profile', icon: UserCircle,   label: 'My Profile' },
    ],
  },
];

function getInitials(user) {
  if (!user) return 'A';
  const name = user.firstName || user.email || user.uid || '';
  return name.charAt(0).toUpperCase() || 'A';
}

function getRoleLabel(user) {
  if (user?.isSuperAdmin) return 'Super Admin';
  if (user?.adminLevel) return user.adminLevel.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return 'Admin';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { unseenCount, openPanel } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const getPageTitle = () => {
    const path = window.location.pathname;
    const map = {
      '/':          'Dashboard',
      '/orders':    'Orders',
      '/riders':    'Riders',
      '/users':    'User Management',
      '/admins':    'Admin Management',
      '/pricing':   'Pricing',
      '/offers':    'Offers',
      '/disputes':  'Disputes',
      '/payments':    'Payments',
      '/withdrawals': 'Withdrawals',
      '/earnings':    'Rider Earnings',
      '/security-deposits': 'Security Deposits',
      '/handling-charges':  'Handling Charges',
    };
    return map[path] || 'Dashboard';
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,15,0.7)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">B</div>
          <div>
            <div className="sidebar-logo-text">Bhada</div>
            <div className="sidebar-logo-badge">ADMIN CONSOLE v2.1</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
            style={{ cursor: 'pointer', borderRadius: 8, transition: 'background .15s' }}
            title="My Profile"
          >
            <div className="sidebar-avatar" style={{ border: '2px solid var(--accent)' }}>{getInitials(user)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.email || user?.uid || 'Admin'}</div>
              <div className="sidebar-user-role">{getRoleLabel(user)}</div>
            </div>
            <UserCircle size={14} style={{ marginLeft: 'auto', color: 'var(--text-2)', flexShrink: 0 }} />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', marginTop: 4 }}
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="btn btn-ghost btn-sm"
            style={{ display: 'none' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="topbar-title" id="page-title">{getPageTitle()}</div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.isSuperAdmin && (
              <span className="badge accent">
                <ShieldCheck size={10} />
                Super Admin
              </span>
            )}

            {/* ── Bell button ── */}
            <button
              onClick={openPanel}
              className="btn btn-ghost btn-sm"
              style={{ position: 'relative', padding: '6px 8px' }}
              title="Notifications"
            >
              <Bell size={18} />
              {unseenCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 17, height: 17, borderRadius: '50%',
                  background: 'var(--accent)', color: 'var(--bg-0)',
                  fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  display: 'grid', placeItems: 'center',
                  border: '2px solid var(--bg-1)',
                }}>
                  {unseenCount > 9 ? '9+' : unseenCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Notification slide-in panel */}
      <NotificationPanel />
    </div>
  );
}