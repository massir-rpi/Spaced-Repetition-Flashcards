import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cookieSignature from 'cookie-signature';

const app = express();
const PORT = process.env.PORT || 3001;
const origins = process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : ['http://localhost:5173'];

const corsOptions = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, res, next) => {
  if (req.path.includes('/api/')) {
    console.log(`\n=== REQUEST DEBUG ===`);
    console.log(`${req.method} ${req.path}`);
    console.log('Origin:', req.headers.origin);
    console.log('Raw cookie header:', req.headers.cookie || 'NO COOKIE HEADER');
    console.log('Parsed cookies:', req.cookies);
    console.log('Signed cookies:', req.signedCookies);
    console.log('Session ID:', req.sessionID);
    console.log('====================\n');
  }
  next();
});

console.log('=== SESSION CONFIG DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('============================');

app.use(session({
  secret: process.env.SESSION_SECRET || 'flashcard-secret-key-change-in-production',
  name: 'connect.sid', // Explicitly set session cookie name
  resave: true, // Force session save on every request
  saveUninitialized: true, // Save new sessions immediately
  rolling: true,
  cookie: { 
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none',
    path: '/',
    domain: undefined // Let browser determine domain
  }
}));

// Intialize database
const db = new Database('flashcards.db');
db.pragma('journal_mode = WAL');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );
`);

// Create cards table
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
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
`);

const nowMs = () => Date.now();

// Bin intervals in milliseconds for bins 1..11 (11 means never)
const BIN_INTERVALS_MS = {
  1: 5 * 1000,                 // 5 seconds
  2: 25 * 1000,                // 25 seconds
  3: 2 * 60 * 1000,            // 2 minutes
  4: 10 * 60 * 1000,           // 10 minutes
  5: 60 * 60 * 1000,           // 1 hour
  6: 5 * 60 * 60 * 1000,       // 5 hours
  7: 24 * 60 * 60 * 1000,      // 1 day
  8: 5 * 24 * 60 * 60 * 1000,  // 5 days
  9: 25 * 24 * 60 * 60 * 1000, // 25 days
  10: 120 * 24 * 60 * 60 * 1000, // ~4 months
  11: null // never
};

// Compute next review at for a given bin
function computeNextReviewAtForBin(targetBin) {
  const interval = BIN_INTERVALS_MS[targetBin];
  return typeof interval === 'number' ? nowMs() + interval : null;
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const ts = nowMs();
    
    const stmt = db.prepare(`INSERT INTO users (username, password_hash, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)`);
    const info = stmt.run(username.trim(), hashedPassword, ts, ts);
    
    req.session.userId = info.lastInsertRowid;
    req.session.username = username;
    
    // Force session save and wait for it
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during signup:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      console.log('=== SIGNUP SUCCESS DEBUG ===');
      console.log('Session ID:', req.sessionID);
      console.log('Session data after save:', req.session);
      console.log('User ID saved:', req.session.userId);
      console.log('Username saved:', req.session.username);
      console.log('============================');
      
      res.json({ 
        user: { 
          id: info.lastInsertRowid, 
          username: username.trim(), 
        } 
      });
    });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate session to ensure clean state
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        return res.status(500).json({ error: 'Session regenerate failed' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      
      console.log('=== AFTER SESSION REGENERATE ===');
      console.log('New session ID:', req.sessionID);
      console.log('Setting userId to:', user.id);
      console.log('Setting username to:', user.username);
      console.log('Session after regenerate:', req.session);
      console.log('================================');

      // Force session save and wait for it
      req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      console.log('=== LOGIN SUCCESS DEBUG ===');
      console.log('Session ID after save:', req.sessionID);
      console.log('Session data after save:', req.session);
      console.log('User ID in session:', req.session.userId);
      console.log('Username in session:', req.session.username);
      
      // Double-check session was saved by reading it back
      setTimeout(() => {
        console.log('=== SESSION VERIFY (1s later) ===');
        console.log('Session ID:', req.sessionID);
        console.log('Session userId:', req.session.userId);
        console.log('Session username:', req.session.username);
        console.log('=================================');
      }, 1000);
      
      console.log('===========================');
      
      // Force session cookie to be sent by touching the session
      req.session.touch();
      
      // Manually set the session cookie header
      const cookieName = 'connect.sid';
      const sessionSecret = process.env.SESSION_SECRET || 'flashcard-secret-key-change-in-production';
      const signedSessionID = cookieSignature.sign(req.sessionID, sessionSecret);
      const cookieValue = `s:${signedSessionID}`;
      
      const cookieHeader = `${cookieName}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${24 * 60 * 60}`;
      res.setHeader('Set-Cookie', cookieHeader);
      
      console.log('=== FORCING COOKIE SEND ===');
      console.log('Session ID to send:', req.sessionID);
      console.log('Manual cookie header:', cookieHeader);
      console.log('Session touched for cookie update');
      console.log('==============================');
      
      // Log response headers being sent
      res.on('finish', () => {
        console.log('=== RESPONSE SENT ===');
        console.log('Set-Cookie header:', res.getHeader('Set-Cookie'));
        console.log('All response headers:', res.getHeaders());
        console.log('====================');
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username
        } 
      });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  console.log('=== AUTH CHECK DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('Full session object:', req.session);
  console.log('Session userId:', req.session.userId);
  console.log('Session username:', req.session.username);
  console.log('Session keys:', Object.keys(req.session));
  console.log('========================');
  
  if (!req.session.userId) {
    console.log('No userId in session - returning 401');
    console.log('Session is:', req.session);
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'User not found' });
  }
  
  console.log('Auth successful, returning user:', user);
  res.json({ user });
});

// Admin: create a card
app.post('/api/cards', requireAuth, (req, res) => {
  const { term, definition } = req.body || {};
  if (!term || !definition) {
    return res.status(400).json({ error: 'Term and definition are required' });
  }
  const ts = nowMs();
  try {
    const stmt = db.prepare(`INSERT INTO cards (user_id, term, definition, bin, nextReviewAt, incorrectCount, isHard, createdAt, updatedAt)
      VALUES (?, ?, ?, 0, NULL, 0, 0, ?, ?)`);
    const info = stmt.run(req.session.userId, term.trim(), definition.trim(), ts, ts);
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(info.lastInsertRowid);
    res.json(card);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'A card with this term already exists.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Admin: list all cards
app.get('/api/cards', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY id ASC').all(req.session.userId);
  const now = nowMs();
  const withStatus = rows.map(r => ({
    ...r,
    timeToNextMs: r.bin >= 1 && r.bin < 11 && r.nextReviewAt ? Math.max(0, r.nextReviewAt - now) : null,
    status: r.isHard ? 'hard' : (r.bin === 11 ? 'never' : 'active')
  }));
  res.json(withStatus);
});

// Admin: delete a card
app.delete('/api/cards/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  try {
    db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?').run(id, req.session.userId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Admin: update a card
app.put('/api/cards/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { term, definition } = req.body || {};
  if (!term || !definition) {
    return res.status(400).json({ error: 'Term and definition are required' });
  }
  try {
    db.prepare('UPDATE cards SET term = ?, definition = ?, updatedAt = ? WHERE id = ? AND user_id = ?').run(term, definition, nowMs(), id, req.session.userId);
    const updated = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, req.session.userId);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

function pickNextCard(userId) {
  const now = nowMs();
  const activeCards = db.prepare('SELECT * FROM cards WHERE user_id = ? AND isHard = 0 AND bin < 11').all(userId);

  if (activeCards.length === 0) {
    // All cards are either hard or bin 11, or no cards exist
    const anyCards = db.prepare('SELECT COUNT(1) as c FROM cards WHERE user_id = ?').get(userId).c;
    if (anyCards === 0) {
      return { card: null, statusMessage: 'You have no cards yet. Go to Admin to create some!' };
    }
    return { card: null, statusMessage: 'You have no more words to review; you are permanently done!' };
  }

  // Due cards: bin >= 1 and nextReviewAt <= now
  const dueCards = activeCards.filter(c => c.bin >= 1 && c.nextReviewAt !== null && c.nextReviewAt <= now);
  if (dueCards.length > 0) {
    const maxBin = Math.max(...dueCards.map(c => c.bin));
    const candidates = dueCards.filter(c => c.bin === maxBin);
    // Order between equal bin and equal times does not matter
    return { card: candidates[0], statusMessage: null };
  }

  // No due cards; try new words from bin 0
  const binZero = activeCards.filter(c => c.bin === 0);
  if (binZero.length > 0) {
    return { card: binZero[0], statusMessage: null };
  }

  // No bin 0 and no due cards -> temporarily done
  return { card: null, statusMessage: 'You are temporarily done; please come back later to review more words.' };
}

// Get next card to review
app.get('/api/next', requireAuth, (req, res) => {
  const { card, statusMessage } = pickNextCard(req.session.userId);
  if (!card) {
    return res.json({ card: null, statusMessage });
  }
  // Only send minimal fields for study view
  const minimal = { id: card.id, term: card.term, definition: card.definition, bin: card.bin };
  res.json({ card: minimal, statusMessage: null });
});

// Submit review result
app.post('/api/review/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { result } = req.body || {};
  if (!['correct', 'incorrect'].includes(result)) {
    return res.status(400).json({ error: "result must be 'correct' or 'incorrect'" });
  }
  const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const ts = nowMs();

  // If the card is not due yet, return the card as is
  // Handles two sessions simultaneously reviewing the same card
  if (card.nextReviewAt > ts) {
    return res.json({ card: card, statusMessage: 'You have already reviewed this word today.' });
  }

  if (result === 'incorrect') {
    const newIncorrect = card.incorrectCount + 1;
    if (newIncorrect >= 10) {
      // Mark as hard to remember; never show again
      db.prepare('UPDATE cards SET isHard = 1, updatedAt = ? WHERE id = ? AND user_id = ?').run(ts, id, req.session.userId);
      const updated = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, req.session.userId);
      return res.json({ card: updated });
    }
    const newBin = 1;
    const nextAt = computeNextReviewAtForBin(newBin);
    db.prepare('UPDATE cards SET bin = ?, nextReviewAt = ?, incorrectCount = ?, updatedAt = ? WHERE id = ? AND user_id = ?')
      .run(newBin, nextAt, newIncorrect, ts, id, req.session.userId);
    const updated = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, req.session.userId);
    return res.json({ card: updated });
  }

  // correct
  let newBin = card.bin === 0 ? 1 : Math.min(11, card.bin + 1);
  const nextAt = computeNextReviewAtForBin(newBin);
  db.prepare('UPDATE cards SET bin = ?, nextReviewAt = ?, updatedAt = ? WHERE id = ? AND user_id = ?')
    .run(newBin, nextAt, ts, id, req.session.userId);
  const updated = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, req.session.userId);
  res.json({ card: updated });
});

app.listen(PORT, () => {
  const host = process.env.HOST || 'http://localhost';
  console.log(`Flashcards API listening on ${host}:${PORT}`);
});


