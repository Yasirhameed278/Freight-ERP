const request = require('supertest');
const app = require('./helpers/createApp');
const db = require('./helpers/testDb');

beforeAll(() => db.connect());
afterAll(() => db.disconnect());
beforeEach(() => db.clear()); // clean state before every test

/* ── helpers ── */
const adminPayload = {
  firstName: 'Admin', lastName: 'User',
  email: 'admin@test.com', password: 'Password123!',
};

const bootstrap = () =>
  request(app).post('/api/auth/bootstrap-admin').send(adminPayload);

const login = (email = adminPayload.email, password = adminPayload.password) =>
  request(app).post('/api/auth/login').send({ email, password });

/* ── bootstrap-admin ── */
describe('POST /api/auth/bootstrap-admin', () => {
  it('creates first admin and returns token', async () => {
    const res = await bootstrap();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.password).toBeUndefined();
  });

  it('blocks second bootstrap attempt', async () => {
    await bootstrap();
    const res = await bootstrap();
    expect(res.status).toBe(403);
  });
});

/* ── login ── */
describe('POST /api/auth/login', () => {
  beforeEach(() => bootstrap());

  it('returns 200 and token on valid credentials', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(adminPayload.email);
  });

  it('returns 401 on wrong password', async () => {
    const res = await login(adminPayload.email, 'WrongPass!');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on missing fields (Joi validation)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'only@email.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'pass' });
    expect(res.status).toBe(400);
  });
});

/* ── /me (protected route) ── */
describe('GET /api/auth/me', () => {
  it('returns user on valid token', async () => {
    await bootstrap();
    const { body: { token } } = await login();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(adminPayload.email);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});

/* ── token refresh ── */
describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refresh cookie is set', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('issues new access token from valid refresh cookie', async () => {
    await bootstrap();
    const loginRes = await login();
    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

/* ── logout ── */
describe('POST /api/auth/logout', () => {
  it('clears cookies and revokes refresh token', async () => {
    await bootstrap();
    const loginRes = await login();
    const token = loginRes.body.token;
    const cookies = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Refresh should now fail — tokenVersion was incremented
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);
    expect(refreshRes.status).toBe(401);
  });
});

/* ── update-password ── */
describe('PATCH /api/auth/password', () => {
  it('returns 400 on Joi validation failure (password too short)', async () => {
    await bootstrap();
    const { body: { token } } = await login();
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123!', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('changes password successfully', async () => {
    await bootstrap();
    const { body: { token } } = await login();
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: adminPayload.password, newPassword: 'NewPassword456!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('old password no longer works after change', async () => {
    await bootstrap();
    const { body: { token } } = await login();
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: adminPayload.password, newPassword: 'NewPassword456!' });

    const res = await login(adminPayload.email, adminPayload.password);
    expect(res.status).toBe(401);
  });
});
