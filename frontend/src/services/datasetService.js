import api from './api';

export const datasetService = {
  async getDatasets() {
    const res = await api.get('/datasets');
    return res.data;
  },

  async getDataset(id) {
    const res = await api.get(`/datasets/${id}`);
    return res.data;
  },

  async createManualDataset(name, tableName, columns, rows = []) {
    const res = await api.post('/datasets', {
      name,
      table_name: tableName,
      columns,
      rows,
    });
    return res.data;
  },

  async previewUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/datasets/preview-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async uploadDataset(name, tableName, file) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('table_name', tableName);
    formData.append('file', file);
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async deleteDataset(id) {
    const res = await api.delete(`/datasets/${id}`);
    return res.data;
  },

  async getTables(datasetId) {
    const res = await api.get(`/datasets/${datasetId}/tables`);
    return res.data;
  },

  async getTableDetails(datasetId, tableName) {
    const res = await api.get(`/datasets/${datasetId}/tables/${tableName}`);
    return res.data;
  },

  async insertTableRow(datasetId, tableName, rowData) {
    const res = await api.post(`/datasets/${datasetId}/tables/${tableName}/rows`, rowData);
    return res.data;
  },

  async createTableInDataset(datasetId, tableName, columns, rows = []) {
    const res = await api.post(`/datasets/${datasetId}/tables`, {
      table_name: tableName,
      columns,
      rows,
    });
    return res.data;
  },

  async uploadTableToDataset(datasetId, tableName, file) {
    const formData = new FormData();
    formData.append('table_name', tableName);
    formData.append('file', file);
    const res = await api.post(`/datasets/${datasetId}/tables/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getDashboardStats() {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },

  async loadSampleDataset(sampleKey) {
    const res = await api.post('/datasets/load-sample', { sample_key: sampleKey });
    return res.data;
  },

  async getDatasetEer(datasetId) {
    const res = await api.get(`/datasets/${datasetId}/eer`);
    return res.data;
  },

  async getGenericEer(params = {}) {
    const res = await api.get('/datasets/eer', { params });
    return res.data;
  },
};
