import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setError('');
      const data = await attendanceService.getSummary();
      setSummary(data);
    } catch (err) {
      setError('Unable to load attendance statistics from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating semester attendance..." />;
  }

  const isGood = summary ? summary.percentage >= 75 : true;

  return (
    <div className="page-wrapper">
      <div className="dashboard-container">
        {/* Header & Student Profile Card */}
        <div className="dashboard-header-card">
          <div className="student-profile-info">
            <div className="student-avatar-circle">
              {user?.fullName?.charAt(0) || 'S'}
            </div>
            <div className="student-identity-block">
              <div className="student-name-row">
                <h1 className="student-name">{user?.fullName}</h1>
                <span className="badge badge-roll">{user?.rollNumber}</span>
              </div>
              <div className="student-meta-row">
                <span className="student-meta-item">
                  <strong>Email:</strong> {user?.email}
                </span>
                <span className="student-meta-separator">•</span>
                <span className="student-meta-item">
                  <strong>DOB:</strong> {user?.dateOfBirth}
                </span>
                <span className="student-meta-separator">•</span>
                <span className="student-meta-item">
                  <strong>Semester Start:</strong> 16 Nov 2026
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <Link to="/attendance" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Manage Attendance</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
            <button
              onClick={fetchSummary}
              className="btn btn-sm btn-outline"
              style={{ marginLeft: '1rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Primary Attendance Metric Banner */}
        <div className={`metric-hero-card ${isGood ? 'status-good' : 'status-warning'}`}>
          <div className="metric-hero-left">
            <div className="metric-caption">Current Semester Attendance</div>
            <div className="metric-percentage-row">
              <span className="metric-percentage-value">
                {summary ? summary.percentage.toFixed(2) : '0.00'}%
              </span>
              <span className={`status-pill ${isGood ? 'pill-green' : 'pill-amber'}`}>
                {isGood ? 'On Track (≥ 75%)' : 'Attendance Warning (< 75%)'}
              </span>
            </div>
            <p className="metric-description">
              {isGood
                ? 'Your attendance meets or exceeds the mandatory university requirement of 75%.'
                : 'Your current attendance has fallen below 75%. Immediate attendance in upcoming classes is required.'}
            </p>
          </div>

          <div className="metric-hero-right">
            <div className="progress-container">
              <div className="progress-labels">
                <span>Overall Progress</span>
                <span>{summary?.percentage.toFixed(1)}% / 100%</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${isGood ? 'fill-green' : 'fill-amber'}`}
                  style={{ width: `${Math.min(100, summary?.percentage || 0)}%` }}
                ></div>
                {/* 75% target indicator line */}
                <div className="target-marker" style={{ left: '75%' }} title="75% Target">
                  <span className="target-label">75% Target</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Attended Hours</div>
            <div className="stat-value">{summary?.attendedHours ?? 0} hrs</div>
            <div className="stat-hint">Hours present in classroom</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Conducted Hours</div>
            <div className="stat-value">{summary?.conductedHours ?? 0} hrs</div>
            <div className="stat-hint">Excludes Sundays and holidays</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Working Days Conducted</div>
            <div className="stat-value">{summary?.workingDays ?? 0} days</div>
            <div className="stat-hint">6 hours per working day</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Holidays Excluded</div>
            <div className="stat-value">{summary?.holidays ?? 0} days</div>
            <div className="stat-hint">Sundays & marked holidays</div>
          </div>
        </div>

        {/* 75% Future Hours Projection Card */}
        <div className="projection-card">
          <div className="projection-content">
            <div className="projection-header">
              <h2 className="projection-title">Future Hours Needed to Reach 75%</h2>
              <span className="projection-tag">Target Formula</span>
            </div>
            <p className="projection-text">
              Based on the official formula{' '}
              <code>max(0, ceil((0.75 × Conducted - Attended) / 0.25))</code>, assuming you attend
              all consecutive upcoming hours without any absence:
            </p>

            <div className="projection-result-box">
              <div className="projection-number">
                {summary?.futureHoursNeeded ?? 0}
                <span className="projection-unit">hours needed</span>
              </div>
              <div className="projection-status-message">
                {(summary?.futureHoursNeeded || 0) === 0 ? (
                  <span className="text-success">
                    ✓ You currently satisfy the 75% threshold. Maintain your current attendance to remain eligible.
                  </span>
                ) : (
                  <span className="text-warning">
                    ⚠️ You must attend the next <strong>{summary?.futureHoursNeeded}</strong> consecutive class hours (approx. {Math.ceil((summary?.futureHoursNeeded || 0) / 6)} working days) without missing any to restore your attendance to 75.00%.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
