import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallPwaButton from './InstallPwaButton';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo-badge">AT</div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">Attendance Tracker</span>
            <span className="navbar-brand-subtitle">Semester 2026</span>
          </div>
        </Link>

        <nav className="navbar-nav">
          <InstallPwaButton />

          {isAuthenticated ? (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/attendance"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Manage Attendance
              </NavLink>

              <div className="nav-user-chip">
                <span className="nav-user-name">{user?.fullName?.split(' ')[0]}</span>
                <span className="nav-user-roll">{user?.rollNumber}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-nav-logout"
                title="Log out of session"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Log In
              </NavLink>
              <NavLink
                to="/signup"
                className={({ isActive }) => (isActive ? 'nav-btn-signup active' : 'nav-btn-signup')}
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
