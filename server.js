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
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'development_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(sessionMiddleware);

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

app.get('/api/users', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in'
    });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE status = ? AND id != ? ORDER BY name',
      ['active', req.session.user.id]
    );

    return res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Users error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not load users'
    });
  }
});

app.get('/api/messages/:otherUserId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Not logged in'
    });
  }

  const currentUserId = req.session.user.id;
  const otherUserId = Number(req.params.otherUserId);

  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user id'
    });
  }

  try {
    const [messages] = await pool.execute(
      `SELECT id, sender_id, receiver_id, message_text, is_read, created_at
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Messages error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not load messages'
    });
  }
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
  const sessionUser = socket.request.session && socket.request.session.user;

  if (!sessionUser) {
    socket.disconnect(true);
    return;
  }

  const userRoom = `user_${sessionUser.id}`;
  socket.join(userRoom);
  console.log(`Socket connected for user ${sessionUser.id}`);

  socket.on('send_message', async (data, callback) => {
    const sender = socket.request.session && socket.request.session.user;
    const receiverId = Number(data?.receiverId);
    const messageText = data?.messageText?.trim();

    function respond(response) {
      if (typeof callback === 'function') {
        callback(response);
      }
    }

    if (!sender) {
      respond({ success: false, message: 'Not logged in' });
      return;
    }

    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      respond({ success: false, message: 'Invalid receiver' });
      return;
    }

    if (!messageText) {
      respond({ success: false, message: 'Message cannot be empty' });
      return;
    }

    if (receiverId === sender.id) {
      respond({ success: false, message: 'You cannot send a message to yourself' });
      return;
    }

    try {
      const [receivers] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND status = ?',
        [receiverId, 'active']
      );

      if (receivers.length === 0) {
        respond({ success: false, message: 'Receiver not found' });
        return;
      }

      const [result] = await pool.execute(
        'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
        [sender.id, receiverId, messageText]
      );

      const [savedMessages] = await pool.execute(
        `SELECT id, sender_id, receiver_id, message_text, is_read, created_at
         FROM messages
         WHERE id = ?`,
        [result.insertId]
      );

      const savedMessage = savedMessages[0];

      io.to(`user_${receiverId}`).emit('receive_message', savedMessage);
      io.to(`user_${sender.id}`).emit('receive_message', savedMessage);

      respond({ success: true, message: savedMessage });
    } catch (error) {
      console.error('Send message error:', error.message);
      respond({ success: false, message: 'Could not send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected for user ${sessionUser.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`MiniChat server is running on port ${PORT}`);
});
