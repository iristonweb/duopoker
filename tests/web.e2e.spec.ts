import { test, expect } from '@playwright/test';

test('health endpoint is available', async ({ request }) => {
  const response = await request.get('http://localhost:4000/health');
  expect(response.ok()).toBeTruthy();
});

test('metrics endpoint is available', async ({ request }) => {
  const response = await request.get('http://localhost:4000/metrics');
  expect(response.ok()).toBeTruthy();
});
