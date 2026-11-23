import express from 'express';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachCoopWebSocketServer } from './backend/coopWsServer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PYTHON_PORT = Number(process.env.PYTHON_PORT || 3001);
const PYTHON_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const IS_PROD = process.env.NODE_ENV === 'production';

let pythonProc: ChildProcess | null = null;
let shuttingDown = false;

function startPythonBackend(): void {
  const scriptPath = path.join(__dirname, 'backend', 'save_server.py');
  const pyBin = process.env.PYTHON_BIN || 'python3';

  pythonProc = spawn(pyBin, [scriptPath, '--host', '127.0.0.1', '--port', String(PYTHON_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProc.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(chunk.toString());
  });

  pythonProc.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[python-stderr] ${chunk.toString()}`);
  });

  pythonProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[server] Python save backend exited with code ${code}; restarting in 1s...`);
      setTimeout(startPythonBackend, 1000);
    }
  });
}

async function waitForPythonReady(retries = 25): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${PYTHON_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // Wait for Python process to bind socket
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

async function createServer(): Promise<void> {
  startPythonBackend();
  await waitForPythonReady();

  const app = express();
  const httpServer = http.createServer(app);
  const closeCoopWs = attachCoopWebSocketServer(httpServer);
  app.use(express.json({ limit: '1mb' }));

  // Proxy all /api/* requests directly to the Python SQLite backend
  app.use('/api', async (req, res) => {
    const targetUrl = `${PYTHON_URL}${req.originalUrl}`;
    try {
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      const contentType = upstream.headers.get('content-type') || 'application/json';
      const text = await upstream.text();
      res.status(upstream.status).setHeader('Content-Type', contentType).send(text);
    } catch (err) {
      console.error('[api-proxy] Python backend error:', err);
      res.status(502).json({ error: 'Python save-state backend unavailable' });
    }
  });

  // Serve Android Digital Asset Links explicitly for TWA APK verification
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const prodPath = path.join(__dirname, 'dist', '.well-known', 'assetlinks.json');
    const devPath = path.join(__dirname, 'public', '.well-known', 'assetlinks.json');
    const targetPath = fs.existsSync(prodPath) ? prodPath : devPath;
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'assetlinks.json not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(targetPath);
  });

  if (!IS_PROD) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : { server: httpServer },
        watch: hmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        dotfiles: 'allow',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Vanguard Vector running at http://0.0.0.0:${PORT} (Python backend -> ${PYTHON_URL}, Co-op WS -> /ws)`);
  });

  const cleanup = () => {
    shuttingDown = true;
    closeCoopWs();
    server.close();
    if (pythonProc && !pythonProc.killed) {
      pythonProc.kill('SIGTERM');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

createServer().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
