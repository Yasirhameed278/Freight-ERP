import api from './axios';

const make = (base) => ({
  list:   (params)     => api.get(base, { params }).then((r) => r.data),
  get:    (id)         => api.get(`${base}/${id}`).then((r) => r.data),
  create: (body)       => api.post(base, body).then((r) => r.data),
  update: (id, body)   => api.patch(`${base}/${id}`, body).then((r) => r.data),
  remove: (id)         => api.delete(`${base}/${id}`).then((r) => r.data),
});

const openPdf = async (url) => {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const type = res.headers?.['content-type'] || 'application/pdf';
    if (!type.includes('pdf')) {
      const text = await res.data.text();
      const msg = JSON.parse(text)?.message || 'PDF generation failed.';
      alert(msg);
      return;
    }
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(blobUrl, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      alert('PDF not available — this document has not been generated yet.');
    } else if (status === 403) {
      alert('You do not have permission to access this document.');
    } else {
      alert(`Could not open PDF: ${err.response?.data?.message || err.message || 'Unknown error'}`);
    }
  }
};

export const clientsApi = {
  ...make('/clients'),
  get360: (id) => api.get(`/clients/${id}/360`).then((r) => r.data),
};

export const ratesApi = {
  ...make('/rates'),
  search: (params) => api.get('/rates/search', { params }).then((r) => r.data),
};

export const quotesApi = {
  ...make('/quotes'),
  send:       (id, body) => api.post(`/quotes/${id}/send`, body || {}).then((r) => r.data),
  accept:     (id)       => api.post(`/quotes/${id}/accept`).then((r) => r.data),
  reject:     (id, reason) => api.post(`/quotes/${id}/reject`, { reason }).then((r) => r.data),
  convert:    (id)       => api.post(`/quotes/${id}/convert`).then((r) => r.data),
  previewPdf: (id)       => openPdf(`/quotes/${id}/pdf`),
};

export const invoicesApi = {
  ...make('/invoices'),
  send:          (id, body) => api.post(`/invoices/${id}/send`, body || {}).then((r) => r.data),
  recordPayment: (id, body) => api.post(`/invoices/${id}/payments`, body).then((r) => r.data),
  cancel:        (id)       => api.post(`/invoices/${id}/cancel`).then((r) => r.data),
  previewPdf:    (id)       => openPdf(`/invoices/${id}/pdf`),
};

export const analyticsApi = {
  overview:        (params) => api.get('/analytics/overview', { params }).then((r) => r.data),
  revenueByMode:   (params) => api.get('/analytics/revenue-by-mode', { params }).then((r) => r.data),
  trend:           (params) => api.get('/analytics/shipments-trend', { params }).then((r) => r.data),
  topCustomers:    (params) => api.get('/analytics/top-customers', { params }).then((r) => r.data),
  pipeline:        ()       => api.get('/analytics/pipeline').then((r) => r.data),
  arAging:         ()       => api.get('/analytics/ar-aging').then((r) => r.data),
  operationalKPIs: ()       => api.get('/analytics/operational-kpis').then((r) => r.data),
  salesSummary:    ()       => api.get('/analytics/sales-summary').then((r) => r.data),
  arByCustomer:    (params) => api.get('/analytics/ar-by-customer', { params }).then((r) => r.data),
  apByVendor:      (params) => api.get('/analytics/ap-by-vendor', { params }).then((r) => r.data),
};

export const activitiesApi = {
  list: (params) => api.get('/activities', { params }).then((r) => r.data),
};

export const dealsApi = {
  getKanban: (params) => api.get('/deals/kanban', { params }).then((r) => r.data),
  list:      (params) => api.get('/deals', { params }).then((r) => r.data),
  get:       (id)     => api.get(`/deals/${id}`).then((r) => r.data),
  create:    (body)   => api.post('/deals', body).then((r) => r.data),
  update:    (id, body) => api.patch(`/deals/${id}`, body).then((r) => r.data),
  move:      (id, body) => api.patch(`/deals/${id}/move`, body).then((r) => r.data),
  reorder:   (items)  => api.patch('/deals/reorder', { items }).then((r) => r.data),
  remove:    (id)     => api.delete(`/deals/${id}`).then((r) => r.data),
};

export const shipmentsApi = {
  list:            (params)        => api.get('/shipments', { params }).then((r) => r.data),
  get:             (id)            => api.get(`/shipments/${id}`).then((r) => r.data),
  create:          (body)          => api.post('/shipments', body).then((r) => r.data),
  update:          (id, body)      => api.patch(`/shipments/${id}`, body).then((r) => r.data),
  remove:          (id)            => api.delete(`/shipments/${id}`).then((r) => r.data),
  updateMilestone: (id, mid, body) => api.patch(`/shipments/${id}/milestones/${mid}`, body).then((r) => r.data),
  addMilestone:    (id, body)      => api.post(`/shipments/${id}/milestones`, body).then((r) => r.data),
  approve:         (id, body)      => api.post(`/shipments/${id}/approve`, body || {}).then((r) => r.data),
  reject:          (id, body)      => api.post(`/shipments/${id}/reject`, body || {}).then((r) => r.data),
  printBL:         (id)            => openPdf(`/shipments/${id}/bl-pdf`),
  getTracking:     (id)            => api.get(`/shipments/${id}/tracking`).then((r) => r.data),
};

export const usersApi = {
  list:       (params)     => api.get('/auth/users', { params }).then((r) => r.data),
  create:     (body)       => api.post('/auth/users', body).then((r) => r.data),
  update:     (id, body)   => api.patch(`/auth/users/${id}`, body).then((r) => r.data),
  deactivate: (id)         => api.post(`/auth/users/${id}/deactivate`).then((r) => r.data),
};

export const notificationsApi = {
  list:       (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: ()      => api.get('/notifications/unread-count').then((r) => r.data),
  markRead:   (id)     => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: ()      => api.patch('/notifications/read-all').then((r) => r.data),
  remove:     (id)     => api.delete(`/notifications/${id}`).then((r) => r.data),
};

export const tasksApi = {
  list:     (params)     => api.get('/tasks', { params }).then((r) => r.data),
  get:      (id)         => api.get(`/tasks/${id}`).then((r) => r.data),
  create:   (body)       => api.post('/tasks', body).then((r) => r.data),
  update:   (id, body)   => api.patch(`/tasks/${id}`, body).then((r) => r.data),
  start:    (id)         => api.post(`/tasks/${id}/start`).then((r) => r.data),
  complete: (id)         => api.post(`/tasks/${id}/complete`).then((r) => r.data),
  remove:   (id)         => api.delete(`/tasks/${id}`).then((r) => r.data),
  myCounts: ()           => api.get('/tasks/my-counts').then((r) => r.data),
};

export const workflowsApi = {
  list:   (params)     => api.get('/workflows', { params }).then((r) => r.data),
  get:    (id)         => api.get(`/workflows/${id}`).then((r) => r.data),
  create: (body)       => api.post('/workflows', body).then((r) => r.data),
  update: (id, body)   => api.patch(`/workflows/${id}`, body).then((r) => r.data),
  toggle: (id)         => api.post(`/workflows/${id}/toggle`).then((r) => r.data),
  remove: (id)         => api.delete(`/workflows/${id}`).then((r) => r.data),
};

export const portalApi = {
  searchRates:   (body)  => api.post('/portal/rates/search', body).then((r) => r.data),
  submitQuote:   (body)  => api.post('/portal/quote-request', body).then((r) => r.data),
  getQuote:      (token) => api.get(`/portal/quote/${token}`).then((r) => r.data),
  acceptQuote:   (token, body) => api.post(`/portal/quote/${token}/accept`, body).then((r) => r.data),
  declineQuote:  (token) => api.post(`/portal/quote/${token}/decline`).then((r) => r.data),
  listRequests:  (params) => api.get('/portal/admin/requests', { params }).then((r) => r.data),
};

export const documentsApi = {
  list: (params) => api.get('/documents', { params }).then((r) => r.data),
  get:  (id)     => api.get(`/documents/${id}`).then((r) => r.data),
  download: async (id, filename) => {
    const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document-${id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
