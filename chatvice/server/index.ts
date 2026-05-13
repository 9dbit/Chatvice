import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerRoutes } from './routes';

const app = express();
const port = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

if (process.env.NODE_ENV === 'production') {
  const publicPath = path.resolve(__dirname, 'public');
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`[chatvice] server running on port ${port}`);
});
