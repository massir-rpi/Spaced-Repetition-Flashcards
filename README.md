# Vocab Flashcards Web App

A modern, full-stack flashcard application for vocabulary learning with spaced repetition and multi-user support.

## Features

### 🔐 User Authentication

- Secure user registration and login
- Session-based authentication
- Password hashing with bcrypt
- User-specific flashcard collections

### 📚 Flashcard Management

- Create, edit, and delete flashcards
- Each card contains a term and definition
- User-specific cards (isolated per user)
- Admin interface for card management

### 🧠 Spaced Repetition System

- Intelligent review scheduling based on performance
- 11-bin system for optimal memory retention
- Cards move between bins based on correct/incorrect answers
- Automatic scheduling for next review dates

### 🎯 Study Interface

- Clean, distraction-free study environment
- Show/hide definition functionality
- Track performance with immediate feedback
- Smart card selection (prioritizes due cards and new words)

## Tech Stack

### Backend

- **Node.js** with Express.js
- **SQLite** database with better-sqlite3
- **bcrypt** for password hashing
- **express-session** for session management
- **CORS** configured for frontend integration

### Frontend

- **Vue.js 3** with Composition API
- **Vue Router** for navigation
- **Vite** for development and building
- Modern CSS with CSS variables
- Responsive design

Made in Cursor with assistance from Claude 4 Sonnet

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm

### Backend Setup

```bash
cd backend
npm install
npm start
```

The backend server will start on `http://localhost:3001`

#### Environment Variables

The backend can be configured using environment variables:

- `PORT` - Server port (default: `3001`)
- `HOST` - Server hostname for console output (default: `localhost`)
- `FRONTEND_URL` - Frontend URL for CORS (default: `http://localhost:5173`)
- `SESSION_SECRET` - Private key to decrypt client requests

Create a `.env` file in the backend directory to override defaults:

```bash
# backend/.env
PORT=3001
HOST=http://your-server-hostname
FRONTEND_URL=http://your-frontend-address:4173
SESSION_SECRET=flashcard-secret-key-change-in-production
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

This will build the frontend for production and serve it on `http://localhost:5173`

#### Environment Variables

The frontend can be configured using environment variables:

- `BACKEND_API_URL` - Backend API URL for Vite proxy (default: `http://localhost:3001`)
- `VITE_API_BASE_URL` - Full API base URL for production deployment (no default)

Create a `.env` file in the frontend directory to override defaults:

```bash
# frontend/.env
# For development (Vite proxy)
BACKEND_API_URL=http://localhost:3001

# For production deployment (full URL)
VITE_API_BASE_URL=https://your-backend.onrender.com
```

## Project Structure

```text
flashcard-web-app/
├── backend/
│   ├── server.js                # Express server with all API endpoints
│   ├── package.json             # Backend dependencies
│   └── flashcards.db            # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable Vue components
│   │   ├── composables/         # Vue composables (useAuth.js)
│   │   ├── views/               # Page components
│   │   │   ├── LoginView.vue    # Authentication page
│   │   │   ├── StudyView.vue    # Study interface
│   │   │   └── AdminView.vue    # Card management
│   │   ├── router/              # Vue Router configuration
│   │   ├── style.css            # Global styles
│   │   ├── App.vue              # Main app component
│   │   └── main.js              # App entry point
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite configuration
└── README.md                    # README
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Flashcards

- `GET /api/cards` - Get user's flashcards
- `POST /api/cards` - Create new flashcard
- `PUT /api/cards/:id` - Update flashcard
- `DELETE /api/cards/:id` - Delete flashcard

### Study System

- `GET /api/next` - Get next card to review
- `POST /api/review/:id` - Submit review result (correct/incorrect)

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### Cards Table

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  bin INTEGER NOT NULL DEFAULT 0,
  nextReviewAt INTEGER,
  incorrectCount INTEGER NOT NULL DEFAULT 0,
  isHard INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(user_id, term)
);
```

## Spaced Repetition

The app uses an 11-bin spaced repetition system:

| Bin | Interval | Description |
|-----|----------|-------------|
| 0   | New      | Unreviewed cards |
| 1   | 5 sec    | Just learned |
| 2   | 25 sec   | Short-term memory |
| 3   | 2 min    | Building confidence |
| 4   | 10 min   | Recent memory |
| 5   | 1 hour   | Short-term retention |
| 6   | 5 hours  | Daily review |
| 7   | 1 day    | Daily retention |
| 8   | 5 days   | Weekly review |
| 9   | 25 days  | Monthly review |
| 10  | ~4 months| Long-term review |
| 11  | Never    | Mastered |

### Card Progression

- **Correct answer**: Card moves to next bin
- **Incorrect answer**: Card returns to bin 1
- **10+ incorrect answers**: Card marked as "hard" and retired

## Usage

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Add Cards**: Navigate to Admin to create flashcards with terms and definitions
3. **Study**: Go to Study view to review cards using spaced repetition
4. **Track Progress**: Cards automatically move through bins based on your performance

## Development

### Running in Development Mode

Backend (with auto-reload):

```bash
cd backend
npm run dev
```

Frontend (with hot reload):

```bash
cd frontend
npm run dev
```

### Building for Production

Frontend:

```bash
cd frontend
npm run build
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- Session-based authentication with secure cookies
- CORS configuration for cross-origin requests
- SQL injection protection with prepared statements
- User isolation (users can only access their own cards)

## License

This project is open source and available under the [MIT License](LICENSE).
