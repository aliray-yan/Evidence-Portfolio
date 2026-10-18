import { createApp } from './app';
import { env } from './config/env';
const app = createApp();
app.listen(env.port, () => {
  console.log(`Blueprint3D API listening on http://localhost:${env.port}`);
});
