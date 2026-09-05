import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderPool } from '../scripts/lib/providers.mjs';

test('ProviderPool initializes and handles community models and fallback gracefully', async () => {
  const dummyProviders = [
    {
      name: 'test-openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      envKey: 'MOCK_OPENROUTER_KEY'
    }
  ];

  const dummyCommunity = {
    baseUrl: 'https://gen.pollinations.ai/v1',
    envKey: 'MOCK_POLLINATIONS_KEY',
    capableModels: [
      { id: 'AkshayCoder48/gpt-4o-latest', name: 'pollinations-gpt-4o', rpm: 5 },
      { id: 'chigwell/llm7-fast', name: 'pollinations-llm7-fast', rpm: 300 }
    ],
    fallbackModels: [
      { id: 'morriszdweck/osaii-api-fast', name: 'pollinations-osaii-fast', rpm: 30 }
    ]
  };

  process.env.MOCK_OPENROUTER_KEY = 'mock-key-123';
  process.env.MOCK_POLLINATIONS_KEY = 'mock-pollinations-key';

  const pool = new ProviderPool(dummyProviders, dummyCommunity);
  assert.equal(pool.providers.length, 1);
  assert.equal(pool.communityConfig.capableModels.length, 2);
  assert.equal(pool.communityConfig.fallbackModels.length, 1);

  await pool.initDynamicCommunityModels();

  assert.ok(pool.available.length >= 1);
  assert.equal(pool.available[pool.available.length - 1].name, 'test-openrouter');
});
