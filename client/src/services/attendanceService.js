import api from './api';

export const attendanceService = {
  async getRecords() {
    const response = await api.get('/attendance');
    return response.data.records;
  },

  async getSummary() {
    const response = await api.get('/attendance/summary');
    return response.data.summary;
  },

  async bulkUpdate(records) {
    const response = await api.put('/attendance/bulk-update', { records });
    return response.data;
  },

  async getByDate(date) {
    const response = await api.get(`/attendance/${date}`);
    return response.data.record;
  }
};
