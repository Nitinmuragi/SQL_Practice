import api from './api';

export const queryService = {
  async executeQuery(datasetId, querySpecOrPayload, rawSql = null) {
    const payload = { dataset_id: datasetId };

    if (rawSql) {
      payload.raw_sql = rawSql;
    } else if (typeof querySpecOrPayload === 'string') {
      payload.raw_sql = querySpecOrPayload;
    } else if (querySpecOrPayload && typeof querySpecOrPayload === 'object') {
      if (querySpecOrPayload.raw_sql) {
        payload.raw_sql = querySpecOrPayload.raw_sql;
      } else if (querySpecOrPayload.query_spec) {
        payload.query_spec = querySpecOrPayload.query_spec;
        if (querySpecOrPayload.raw_sql) {
          payload.raw_sql = querySpecOrPayload.raw_sql;
        }
      } else {
        payload.query_spec = querySpecOrPayload;
      }
    }

    const res = await api.post('/query/execute', payload);
    return res.data;
  },

  async getHistory(page = 1, perPage = 20) {
    const res = await api.get('/query/history', {
      params: { page, per_page: perPage },
    });
    return res.data;
  },

  async getHistoryItem(id) {
    const res = await api.get(`/query/history/${id}`);
    return res.data;
  },
};
