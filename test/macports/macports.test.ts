import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('Macports resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install and uninstall macports', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    await PluginTester.fullTest(pluginPath, [{
      type: 'macports',
      install: [
        { name: 'libelf', version: '@0.8.13_2' },
        'aom'
      ]
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; which port')).to.not.throw;
      },
    });
  });
})
