import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    email: '',
    rollNumber: '',
    dateOfBirth: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const { email, rollNumber, dateOfBirth, newPassword, confirmPassword } = formData;

    if (!email.trim() || !rollNumber.trim() || !dateOfBirth || !newPassword || !confirmPassword) {
      setErrorMessage('All verification fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New Password and Confirm Password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.forgotPassword({
        email: email.trim().toLowerCase(),
        rollNumber: rollNumber.trim().toUpperCase(),
        dateOfBirth,
        newPassword,
        confirmPassword
      });

      setSuccessMessage(res.message || 'Password reset successfully! You can now log in.');
      setFormData({
        email: '',
        rollNumber: '',
        dateOfBirth: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Verification details could not be matched. Please verify your inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-header-badge">Security Recovery</div>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Verify your registered student details to set a new password.
          </p>
        </div>

        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/login" className="btn btn-primary btn-sm">
                Proceed to Login
              </Link>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        {!successMessage && (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Registered Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={handleChange}
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

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Re-enter new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? 'Verifying & Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-card-footer">
          <Link to="/login" className="auth-link">
            ← Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
