import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Service running on port ${config.port} [${config.nodeEnv}]`);
});