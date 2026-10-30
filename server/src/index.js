
import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 4000;

const server = app.listen(port, (err) => {
  if (err) {
    console.error('Could not start API:', err.code, err.message);
    process.exit(1);
  }
  console.log(`API running on http://localhost:${port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.code, err.message);
});
