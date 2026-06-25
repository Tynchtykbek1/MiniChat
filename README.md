# MiniChat - Real-Time Private Messaging Web Application

MiniChat is a simple web programming project with user registration and login, private real-time messaging, message history, and admin moderation.

The project is built with Node.js, Express, Socket.IO, MySQL, and a simple HTML/CSS/JavaScript frontend using jQuery.

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- MySQL
- mysql2
- bcrypt
- express-session
- dotenv
- HTML
- CSS
- JavaScript
- jQuery
- XAMPP/MySQL for local development

## Main Features

- User registration and login
- Password hashing with bcrypt
- Session-based authentication
- Private user-to-user chat
- Real-time messaging with Socket.IO
- Message history stored in MySQL
- User list
- Admin dashboard
- Block/unblock users
- Delete messages
- Protected admin routes

## Project Structure

```text
MiniChat/
├── server.js
├── db.js
├── database.sql
├── .env.example
├── public/
│   ├── login.html
│   ├── register.html
│   ├── chat.html
│   ├── admin.html
│   ├── js/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   └── admin.js
│   └── css/
│       └── style.css
```

### Main Files

- `server.js` - Main Express server. Contains API routes, session setup, Socket.IO setup, authentication, chat, and admin routes.
- `db.js` - MySQL connection pool using `mysql2`.
- `database.sql` - SQL script for creating the database tables and default admin account.
- `.env.example` - Example environment variables needed to run the project.
- `public/login.html` - Login page.
- `public/register.html` - Registration page.
- `public/chat.html` - Main chat page with user list and private chat area.
- `public/admin.html` - Admin dashboard for managing users and messages.
- `public/js/auth.js` - Frontend JavaScript for login and registration using jQuery AJAX.
- `public/js/chat.js` - Frontend JavaScript for chat page, user loading, message history, Socket.IO connection, and logout.
- `public/js/admin.js` - Frontend JavaScript for admin dashboard actions.
- `public/css/style.css` - Shared CSS styles for authentication pages, chat page, and admin page.

## Installation Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd MiniChat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the `.env` file

Copy `.env.example` and rename the copy to `.env`.

Example:

```bash
cp .env.example .env
```

On Windows, you can also create the `.env` file manually.

### 4. Start MySQL with XAMPP

Open XAMPP and start the MySQL service.

### 5. Import the database

Import `database.sql` into MySQL.

You can do this using phpMyAdmin:

1. Open `http://localhost/phpmyadmin`
2. Go to the Import tab
3. Select `database.sql`
4. Click Import

The script creates the `minichat` database, required tables, and the default admin account.

### 6. Run the application

```bash
npm start
```

### 7. Open the application

Open this URL in your browser:

```text
http://localhost:3000/login.html
```

## Example `.env`

Use these values for local development. Change `SESSION_SECRET` in real projects.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=minichat
SESSION_SECRET=change_this_secret
```

## Default Admin Account

```text
Email: admin@minichat.com
Password: admin123
```

After logging in as the admin, open:

```text
http://localhost:3000/admin.html
```

## Main API Routes

### Authentication

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Log in and create a session |
| POST | `/api/logout` | Destroy the current session |
| GET | `/api/me` | Get the currently logged-in user |

### Users and Messages

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/users` | Get all active users except the current user |
| GET | `/api/messages/:otherUserId` | Get message history with another user |

### Admin

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/admin/users` | Get all users |
| PATCH | `/api/admin/users/:id/status` | Block or unblock a user |
| GET | `/api/admin/messages` | Get the latest 100 messages |
| DELETE | `/api/admin/messages/:id` | Delete a selected message |

## Socket.IO Events

| Event | Direction | Description |
| --- | --- | --- |
| `send_message` | Client to server | Sends a private message to another user |
| `receive_message` | Server to client | Delivers a saved message to the sender and receiver |

## How Real-Time Messaging Works

When a logged-in user opens the chat page, the browser connects to Socket.IO. The server reads the same session used by Express to identify the logged-in user.

Each connected user joins a private Socket.IO room named with their user id, for example:

```text
user_5
```

When a user sends a message, the frontend emits the `send_message` event with the receiver id and message text. The server validates the data, checks that the receiver exists and is active, saves the message in MySQL, and then emits `receive_message` to both users.

Messages are saved in the database before being emitted so that message history is not lost when the page is refreshed.

## How Admin Protection Works

Admin API routes use a `requireAdmin` middleware.

This middleware checks:

1. The user is logged in using `req.session.user`
2. The logged-in user's role is `admin`

If the user is not logged in, the server returns `401 Unauthorized`.

If the user is logged in but is not an admin, the server returns `403 Forbidden`.

This protects admin features such as viewing all users, blocking/unblocking users, viewing recent messages, and deleting messages.

## Conclusion

MiniChat is a simple full-stack Web Programming project that demonstrates authentication, sessions, MySQL database usage, private real-time messaging with Socket.IO, and a basic admin moderation panel.

The code is intentionally kept simple so the main concepts are easy to understand and explain.
