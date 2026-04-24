import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../middleware.js';

const router = Router();

// POST /register
router.post('/register', (req, res) => {
  try {
    const { username, password, age, gender } = req.body;

    // Validation
    if (!username || !password || !age || !gender) {
      return res.status(400).json({ error: 'All fields are required: username, password, age, gender' });
    }
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be Male, Female, or Other' });
    }
    if (typeof age !== 'number' || age < 1 || age > 120) {
      return res.status(400).json({ error: 'Age must be a number between 1 and 120' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare(
      'INSERT INTO users (username, password, age, gender) VALUES (?, ?, ?, ?)'
    ).run(username, hash, age, gender);

    const user = { id: info.lastInsertRowid, username, age, gender };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = bcrypt.compareSync(password, row.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = { id: row.id, username: row.username, age: row.age, gender: row.gender };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
