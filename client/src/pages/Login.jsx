import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const successMessage = location.state?.message;

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!rollNumber.trim() || !password) {
      setErrorMessage('Please enter both Roll Number and Password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(rollNumber.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid Roll Number or Password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-header-badge">Semester Attendance</div>
          <h1 className="auth-title">Student Login</h1>
          <p className="auth-subtitle">
            Enter your Roll Number to access your semester dashboard and monitor your 75% target.
          </p>
        </div>

        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="rollNumber" className="form-label">
              Roll Number
            </label>
            <input
              id="rollNumber"
              type="text"
              className="form-input"
              placeholder="e.g. CS2026001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              autoCapitalize="characters"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <Link to="/forgot-password" className="form-link-subtle">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        <div className="auth-card-footer">
          <span>First time here? </span>
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
