require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcrypt');

const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'development_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MiniChat API is running'
  });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required'
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not register user'
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is not active'
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not log in'
    });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Could not log out'
      });
    }

    res.clearCookie('connect.sid');
    return res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in'
    });
  }

  return res.json({
    success: true,
    user: req.session.user
  });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`MiniChat server is running on port ${PORT}`);
});
