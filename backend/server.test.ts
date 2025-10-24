import { app, pool } from './server.ts';
import request from 'supertest';
import WebSocket from 'ws';

// Helper to create test user
async function createTestUser(email, password) {
  await pool.query(
    `INSERT INTO users (email, password) VALUES ($1, $2)`,
    [email, password]
  );
}

describe('User Authentication', () => {
  beforeEach(async () => {
    await pool.query('BEGIN');
  });

  afterEach(async () => {
    await pool.query('ROLLBACK');
  });

  test('should register new user', async () => {
    const response = await request(app)
     .post('/api/users/register')
     .send({ email: 'test@example.com', password: 'password123', username: 'testuser' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user_id');
    expect(response.body).toHaveProperty('auth_token');
  });

  test('should fail registration with duplicate email', async () => {
    await createTestUser('duplicate@example.com', 'password123');
    
    const response = await request(app)
     .post('/api/users/register')
     .send({ email: 'duplicate@example.com', password: 'password123', username: 'testuser' });
    
    expect(response.status).toBe(400);
  });

  test('should authenticate valid user', async () => {
    await createTestUser('valid@example.com', 'password123');
    
    const response = await request(app)
     .post('/api/users/login')
     .send({ email: 'valid@example.com', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user_id');
    expect(response.body).toHaveProperty('auth_token');
  });

  test('should fail authentication with wrong password', async () => {
    await createTestUser('wrongpass@example.com', 'password123');
    
    const response = await request(app)
     .post('/api/users/login')
     .send({ email: 'wrongpass@example.com', password: 'wrongpassword' });
    
    expect(response.status).toBe(401);
  });
});

describe('Challenges', () => {
  let adminToken;

  beforeEach(async () => {
    await pool.query('BEGIN');
    // Create admin user
    await pool.query(
      `INSERT INTO users (email, password, is_admin) VALUES ($1, $2, true)`,
      ['admin@example.com', 'adminpassword']
    );
    const res = await request(app)
     .post('/api/users/login')
     .send({ email: 'admin@example.com', password: 'adminpassword' });
    adminToken = res.body.auth_token;
  });

  afterEach(async () => {
    await pool.query('ROLLBACK');
  });

  test('should create challenge as admin', async () => {
    const response = await request(app)
     .post('/api/challenges')
     .set("Authorization", `Bearer ${adminToken}`)
     .send({
        title: 'Test Challenge',
        description: 'Test description',
        start_date: '2023-01-01',
        end_date: '2023-01-31'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  test('should list challenges', async () => {
    await pool.query(
      `INSERT INTO challenges (title, description, start_date, end_date) 
       VALUES ($1, $2, $3, $4)`,
      ['Test Challenge 1', 'Desc 1', '2023-01-01', '2023-01-31']
    );
    
    const response = await request(app).get('/api/challenges');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

describe('WebSocket Events', () => {
  let wsClient;

  beforeEach(() => {
    wsClient = new WebSocket('ws://localhost:3000');
  });

  afterEach(() => {
    wsClient.close();
  });

  test('should receive new notification event', async () => {
    return new Promise((resolve) => {
      wsClient.on('open', async () => {
        // Create notification via API
        await request(app)
         .post('/api/notifications')
         .send({ user_id: 1, message: 'Test notification' });
        
        wsClient.on('message', (message) => {
          const data = JSON.parse(message.toString());
          if (data.event === 'new_notification') {
            expect(data.notification.message).toBe('Test notification');
            resolve();
          }
        });
      });
    });
  });
});

describe('Database Operations', () => {
  beforeEach(async () => {
    await pool.query('BEGIN');
  });

  afterEach(async () => {
    await pool.query('ROLLBACK');
  });

  test('should create and retrieve activity', async () => {
    await pool.query(
      `INSERT INTO users (email, password) VALUES ($1, $2)`,
      ['activityuser@example.com', 'password123']
    );
    
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', ['activityuser@example.com']);
    const userId = userRes.rows[0].id;
    
    const response = await request(app)
     .post('/api/activities')
     .set("Authorization", `Bearer valid-token`) // Assuming auth token is handled
     .send({ activity_type: 'biking', date: '2023-01-01' });
    
    expect(response.status).toBe(201);
    
    const activityRes = await pool.query(
      `SELECT * FROM activities WHERE user_id = $1`,
      [userId]
    );
    expect(activityRes.rows.length).toBe(1);
  });
});
