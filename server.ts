import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("feedback.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_json TEXT,
    is_accurate BOOLEAN,
    actual_shots REAL,
    user_comment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/feedback", (req, res) => {
    const { prediction, isAccurate, actualShots, userComment } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO feedback (prediction_json, is_accurate, actual_shots, user_comment)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(JSON.stringify(prediction), isAccurate ? 1 : 0, actualShots, userComment);
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/feedback/recent", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM feedback 
        WHERE is_accurate = 0 
        ORDER BY timestamp DESC 
        LIMIT 5
      `).all();
      res.json(rows);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
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
