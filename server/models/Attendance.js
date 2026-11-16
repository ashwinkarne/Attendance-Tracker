const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: String, // Stored as YYYY-MM-DD (e.g., 2026-11-16)
      required: true
    },
    day: {
      type: String, // e.g., 'Monday', 'Sunday'
      required: true
    },
    isHoliday: {
      type: Boolean,
      default: false
    },
    hoursPresent: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      default: 6
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring one record per user per date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
