import { createContainer } from './interface/container.js';
import { buildApp } from './interface/http/app.js';

/**
 * OmniLang SME Commerce Agent — Cloud Run entry point.
 * Listens on PORT (Cloud Run default 8080) and shuts down gracefully on
 * SIGTERM so the platform can drain in-flight requests.
 */
const container = createContainer();
const app = buildApp(container);

const server = app.listen(container.config.port, () => {
  const mode = container.config.demoMode ? 'demo' : 'production';
  console.log(`[omnilang] listening on :${container.config.port} (${mode} mode, ${container.config.persistence} persistence)`);
});

function shutdown(signal: string): void {
  console.log(`[omnilang] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
