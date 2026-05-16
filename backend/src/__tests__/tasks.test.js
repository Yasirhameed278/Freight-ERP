const request = require('supertest');
const app = require('./helpers/createApp');
const db = require('./helpers/testDb');

beforeAll(() => db.connect());
afterAll(() => db.disconnect());
beforeEach(() => db.clear()); // clean state before every test

/* ── helpers ── */
const getToken = async () => {
  await request(app).post('/api/auth/bootstrap-admin').send({
    firstName: 'Admin', lastName: 'User',
    email: 'admin@test.com', password: 'Password123!',
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'Password123!' });
  return res.body.token;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/* ── create task ── */
describe('POST /api/tasks', () => {
  it('creates a task with valid payload', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({ title: 'Follow up with client', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Follow up with client');
    expect(res.body.task.priority).toBe('high');
    expect(res.body.task.status).toBe('open');
  });

  it('returns 400 when title is missing', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({ priority: 'high' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid priority enum', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({ title: 'Test', priority: 'critical' }); // not in enum
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });
});

/* ── list tasks ── */
describe('GET /api/tasks', () => {
  it('returns paginated task list', async () => {
    const token = await getToken();
    await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Task A' });
    await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Task B' });

    const res = await request(app).get('/api/tasks').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  it('filters by status', async () => {
    const token = await getToken();
    await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Open task' });

    const res = await request(app).get('/api/tasks?status=open').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.items.every((t) => t.status === 'open')).toBe(true);
  });
});

/* ── get single task ── */
describe('GET /api/tasks/:id', () => {
  it('returns task by id', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({ title: 'Specific task' });

    const res = await request(app).get(`/api/tasks/${task._id}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.task._id).toBe(task._id);
  });

  it('returns 400 on invalid ObjectId', async () => {
    const token = await getToken();
    const res = await request(app).get('/api/tasks/not-a-valid-id').set(auth(token));
    expect(res.status).toBe(400);
  });
});

/* ── update task ── */
describe('PATCH /api/tasks/:id', () => {
  it('updates title and priority', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks').set(auth(token)).send({ title: 'Original' });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set(auth(token))
      .send({ title: 'Updated', priority: 'urgent' });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Updated');
    expect(res.body.task.priority).toBe('urgent');
  });

  it('returns 400 on empty patch body', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks').set(auth(token)).send({ title: 'Task' });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set(auth(token))
      .send({});
    expect(res.status).toBe(400);
  });
});

/* ── start / complete transitions ── */
describe('Task state transitions', () => {
  it('starts an open task → in_progress', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks').set(auth(token)).send({ title: 'Task' });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/start`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('in_progress');
  });

  it('completes an in_progress task → done', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks').set(auth(token)).send({ title: 'Task' });
    await request(app).post(`/api/tasks/${task._id}/start`).set(auth(token));

    const res = await request(app)
      .post(`/api/tasks/${task._id}/complete`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('done');
    expect(res.body.task.completedAt).toBeDefined();
  });
});

/* ── delete task ── */
describe('DELETE /api/tasks/:id', () => {
  it('deletes task', async () => {
    const token = await getToken();
    const { body: { task } } = await request(app)
      .post('/api/tasks').set(auth(token)).send({ title: 'To delete' });

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/api/tasks/${task._id}`).set(auth(token));
    expect(getRes.status).toBe(404);
  });
});
