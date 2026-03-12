import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

import authRoutes from "./src/backend/routes/authRoutes.js";
import productRoutes from "./src/backend/routes/productRoutes.js";
import slideshowRoutes from "./src/backend/routes/slideshowRoutes.js";
import storeRoutes from "./src/backend/routes/storeRoutes.js";
import articleRoutes from "./src/backend/routes/articleRoutes.js";
import pool from "./src/backend/config/db.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin) return callback(null, true);
      const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
      if (allowed.length === 0 || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept']
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Direct Test Route
  app.post("/api/test", (req, res) => {
    console.log("DEBUG: /api/test hit!");
    res.json({ message: "API is working", body: req.body });
  });

  // Request Logging Middleware (safe append)
  app.use((req, res, next) => {
    try {
      const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
      fs.appendFileSync("access.log", logEntry);
      console.log(logEntry.trim());
    } catch (e) {
      console.error('Failed to write access log:', e);
    }
    next();
  });

  // Test Database Connection
  try {
    console.log("--------------------------------------------------");
    console.log("🔍 Testing Database Connection...");
    const connection = await pool.getConnection();
    console.log("✅ SUCCESS: Connected to MySQL database!");
    connection.release();
  } catch (err: any) {
    console.error("❌ DATABASE CONNECTION ERROR:", err.message);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API is reachable" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/slideshow", slideshowRoutes);
  app.use("/api/stores", storeRoutes);
  app.use("/api/articles", articleRoutes);

  // Static images (legacy-friendly)
  app.use('/images', express.static(path.join(process.cwd(), 'src', 'images')));
  app.use('/slideshow', express.static(path.join(process.cwd(), 'src', 'images', 'slideshow')));
  app.use('/produk', express.static(path.join(process.cwd(), 'src', 'images', 'produk')));
  app.use('/banner', express.static(path.join(process.cwd(), 'src', 'images', 'banner')));

  // Debug: list registered routes (including mounted routers)
  app.get('/api/routes', (req, res) => {
    try {
      const routes: Array<any> = [];
      const stack: any[] = (app as any)._router?.stack || [];

      stack.forEach((layer: any) => {
        // direct routes
        if (layer.route && layer.route.path) {
          routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods).map((m: string) => m.toUpperCase()) });
        }
        // mounted routers
        else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          const mountPath = layer.regexp && layer.regexp.source ? layer.regexp.source : '';
          layer.handle.stack.forEach((l: any) => {
            if (l.route && l.route.path) {
              routes.push({ path: `${mountPath}${l.route.path}`, methods: Object.keys(l.route.methods).map((m: string) => m.toUpperCase()) });
            }
          });
        }
      });

      return res.json({ routes });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to enumerate routes' });
    }
  });

  // 404 for API - Catch everything under /api that wasn't matched
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "API Route Not Found", 
      method: req.method,
      path: req.originalUrl
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
