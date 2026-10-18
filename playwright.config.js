import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./tests/e2e', timeout:30000, use:{ baseURL:process.env.TEST_GAME_URL || 'http://localhost:8080', headless:true, channel:'msedge' }, webServer:process.env.TEST_GAME_URL ? undefined : { command:'npm run dev -- --strictPort',url:'http://localhost:8080',reuseExistingServer:true }, reporter:'list' });
