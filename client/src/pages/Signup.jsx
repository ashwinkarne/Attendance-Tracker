import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rollNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { fullName, email, rollNumber, dateOfBirth, password, confirmPassword } = formData;

    if (!fullName.trim() || !email.trim() || !rollNumber.trim() || !dateOfBirth || !password || !confirmPassword) {
      setErrorMessage('All fields are required.');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        rollNumber: rollNumber.trim().toUpperCase(),
        dateOfBirth,
        password,
        confirmPassword
      });

      navigate('/login', {
        state: {
          message: 'Account created successfully! Attendance records generated from 16 Nov 2026. Please log in.'
        }
      });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-card-header">
          <div className="auth-header-badge">Semester Attendance</div>
          <h1 className="auth-title">Student Registration</h1>
          <p className="auth-subtitle">
            Create your account to start tracking your semester attendance from 16 November 2026.
          </p>
        </div>

        {errorMessage && (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="form-input"
                placeholder="e.g. Arun Kumar"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="rollNumber" className="form-label">
                Roll Number
              </label>
              <input
                id="rollNumber"
                name="rollNumber"
                type="text"
                className="form-input"
                placeholder="e.g. CS2026001"
                value={formData.rollNumber}
                onChange={handleChange}
                autoCapitalize="characters"
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                College / Personal Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth" className="form-label">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-notice">
            <span>ℹ️ Semester starts on 16 November 2026. Daily records default to 6/6 hours. Sundays are holidays.</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="auth-card-footer">
          <span>Already registered? </span>
          <Link to="/login" className="auth-link">
            Log in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
