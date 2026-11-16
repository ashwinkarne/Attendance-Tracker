import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../services/attendanceService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AttendanceManagement() {
  const [records, setRecords] = useState([]);
  const [initialRecordsMap, setInitialRecordsMap] = useState({});
  const [modifiedDates, setModifiedDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setSaveError('');
      const data = await attendanceService.getRecords();
      setRecords(data);

      const map = {};
      data.forEach((r) => {
        map[r.date] = {
          isHoliday: r.isHoliday,
          hoursPresent: r.hoursPresent
        };
      });
      setInitialRecordsMap(map);
      setModifiedDates(new Set());
    } catch (err) {
      setSaveError('Failed to load attendance records. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleHolidayToggle = (dateStr) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.date !== dateStr) return rec;
        if (rec.day.toLowerCase() === 'sunday') return rec; // Sunday cannot be edited

        const willBeHoliday = !rec.isHoliday;
        return {
          ...rec,
          isHoliday: willBeHoliday,
          hoursPresent: willBeHoliday ? 0 : 6 // Restore 6/6 by default when unmarked
        };
      })
    );

    setModifiedDates((prev) => new Set(prev).add(dateStr));
    setSaveSuccess('');
  };

  const handleHoursChange = (dateStr, newHours) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.date !== dateStr) return rec;
        return {
          ...rec,
          hoursPresent: Number(newHours)
        };
      })
    );

    setModifiedDates((prev) => new Set(prev).add(dateStr));
    setSaveSuccess('');
  };

  const handleSaveChanges = async () => {
    if (modifiedDates.size === 0) {
      setSaveSuccess('All changes are already saved.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const recordsToSave = records
        .filter((r) => modifiedDates.has(r.date))
        .map((r) => ({
          date: r.date,
          isHoliday: r.isHoliday,
          hoursPresent: r.hoursPresent
        }));

      const res = await attendanceService.bulkUpdate(recordsToSave);

      // Re-baseline initial state
      const newMap = { ...initialRecordsMap };
      recordsToSave.forEach((r) => {
        newMap[r.date] = {
          isHoliday: r.isHoliday,
          hoursPresent: r.hoursPresent
        };
      });
      setInitialRecordsMap(newMap);
      setModifiedDates(new Set());

      setSaveSuccess(
        `Successfully saved attendance records for ${recordsToSave.length} date${
          recordsToSave.length > 1 ? 's' : ''
        }! Dashboard updated.`
      );
    } catch (err) {
      setSaveError(
        err.response?.data?.message || 'Failed to save attendance updates. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading attendance records..." />;
  }

  // Format date helper: "2026-11-16" -> "16 Nov 2026"
  const formatDateDisplay = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const todayStr = records.length > 0 ? records[0].date : ''; // Newest date first is today

  return (
    <div className="page-wrapper">
      <div className="attendance-page-container">
        {/* Sticky Action and Info Header */}
        <div className="attendance-top-bar">
          <div className="attendance-title-block">
            <Link to="/" className="btn-back-link">
              ← Back to Dashboard
            </Link>
            <h1 className="attendance-page-title">Attendance Management</h1>
            <p className="attendance-page-subtitle">
              Configure daily classroom attendance and declare official holidays. Every working day contains 6 hours.
            </p>
          </div>

          <div className="attendance-action-controls">
            {modifiedDates.size > 0 && (
              <span className="unsaved-badge">
                {modifiedDates.size} unsaved change{modifiedDates.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary btn-save"
              onClick={handleSaveChanges}
              disabled={saving || modifiedDates.size === 0}
            >
              {saving ? 'Saving...' : 'Done / Save Changes'}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="alert alert-success" role="alert">
            ✓ {saveSuccess}
          </div>
        )}

        {saveError && (
          <div className="alert alert-error" role="alert">
            ✕ {saveError}
          </div>
        )}

        {/* Date Cards List */}
        <div className="attendance-list">
          {records.map((record) => {
            const isSun = record.day.toLowerCase() === 'sunday';
            const isToday = record.date === todayStr;
            const isModified = modifiedDates.has(record.date);

            return (
              <div
                key={record.date}
                className={`date-card ${isSun ? 'card-sunday' : ''} ${
                  record.isHoliday && !isSun ? 'card-holiday' : ''
                } ${isModified ? 'card-modified' : ''}`}
              >
                <div className="date-card-left">
                  <div className="date-display-group">
                    <span className="date-number">{formatDateDisplay(record.date)}</span>
                    <span className="date-day-name">{record.day}</span>
                  </div>

                  <div className="date-badges-group">
                    {isToday && <span className="badge badge-today">Today</span>}
                    {isSun && <span className="badge badge-sunday">Sunday (Holiday)</span>}
                    {record.isHoliday && !isSun && (
                      <span className="badge badge-manual-holiday">Marked as Holiday</span>
                    )}
                    {isModified && <span className="badge badge-unsaved">Modified</span>}
                  </div>
                </div>

                <div className="date-card-right">
                  {/* Holiday Toggle Button */}
                  {isSun ? (
                    <span className="sunday-notice-text">Official Sunday Holiday</span>
                  ) : (
                    <button
                      type="button"
                      className={`btn-holiday-toggle ${
                        record.isHoliday ? 'btn-holiday-active' : 'btn-holiday-inactive'
                      }`}
                      onClick={() => handleHolidayToggle(record.date)}
                      title={record.isHoliday ? 'Restore as working day' : 'Mark date as holiday'}
                    >
                      {record.isHoliday ? 'Marked as Holiday (Click to Restore)' : 'Mark as Holiday'}
                    </button>
                  )}

                  {/* Hours Present Dropdown */}
                  <div className="hours-dropdown-wrapper">
                    <label htmlFor={`hours-${record.date}`} className="hours-dropdown-label">
                      Hours Present:
                    </label>
                    <select
                      id={`hours-${record.date}`}
                      className="hours-select"
                      disabled={isSun || record.isHoliday}
                      value={record.isHoliday ? 0 : record.hoursPresent}
                      onChange={(e) => handleHoursChange(record.date, e.target.value)}
                    >
                      <option value="0">0 / 6</option>
                      <option value="1">1 / 6</option>
                      <option value="2">2 / 6</option>
                      <option value="3">3 / 6</option>
                      <option value="4">4 / 6</option>
                      <option value="5">5 / 6</option>
                      <option value="6">6 / 6</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Bar for easy mobile accessibility */}
        <div className="attendance-bottom-bar">
          <button
            type="button"
            className="btn btn-primary btn-block btn-save"
            onClick={handleSaveChanges}
            disabled={saving || modifiedDates.size === 0}
          >
            {saving ? 'Saving...' : `Done / Save Changes (${modifiedDates.size} pending)`}
          </button>
        </div>
      </div>
    </div>
  );
}
