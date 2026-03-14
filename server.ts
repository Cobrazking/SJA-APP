import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import session from "express-session";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = "sja-jwt-secret-key";

declare module "express-session" {
  interface SessionData {
    userId: any;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("sja.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS sja_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);
  app.use(express.json({ limit: '10mb' }));
  
  app.get("/api/health", (req, res) => {
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      res.json({ status: "ok", users: userCount.count });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  app.use(session({
    secret: "sja-secret-key",
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: { 
      secure: true,      // Required for SameSite=None
      sameSite: 'none',  // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.userId = decoded.userId;
        return next();
      } catch (err) {
        console.error("JWT verification failed:", err.message);
      }
    }
    
    if (req.session.userId) {
      req.userId = req.session.userId;
      return next();
    }
    
    res.status(401).json({ error: "Unauthorized" });
  };

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    console.log(`Register attempt: ${username}`);
    try {
      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
      const info = stmt.run(username, password);
      const userId = info.lastInsertRowid;
      req.session.userId = userId;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
      console.log(`User registered: ${username}, ID: ${userId}`);
      res.json({ success: true, userId, token });
    } catch (err: any) {
      console.error(`Register failed for ${username}:`, err.message);
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt: ${username}`);
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      req.session.userId = user.id;
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      console.log(`Login success: ${username}, ID: ${user.id}`);
      res.json({ success: true, userId: user.id, token });
    } else {
      console.warn(`Login failed: ${username}`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    let userId = req.session.userId;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.userId;
      } catch (err) {}
    }

    if (userId) {
      const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId) as any;
      res.json({ user });
    } else {
      res.json({ user: null });
    }
  });

  // SJA Routes
  app.post("/api/sja", authenticate, (req, res) => {
    const data = JSON.stringify(req.body);
    console.log(`Saving SJA for user ${req.userId}`);
    const stmt = db.prepare("INSERT INTO sja_forms (user_id, data) VALUES (?, ?)");
    const info = stmt.run(req.userId, data);
    console.log(`SJA saved with ID: ${info.lastInsertRowid}`);
    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.get("/api/sja", authenticate, (req, res) => {
    console.log(`Fetching SJA forms for user ${req.userId}`);
    const forms = db.prepare("SELECT * FROM sja_forms WHERE user_id = ? ORDER BY created_at DESC").all(req.userId) as any[];
    res.json(forms.map(f => ({
      id: f.id,
      created_at: f.created_at,
      ...JSON.parse(f.data)
    })));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
