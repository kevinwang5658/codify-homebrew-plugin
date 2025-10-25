import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { ResourceOperation } from 'codify-schemas';
import os from 'node:os';

describe('File integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can download a file from codify cloud', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'remote-file',
        path: './my_test_file',
        remote: 'codify://29198d08-08fb-44aa-a014-c45690aa822b:favicon.svg',
      }
    ], {
      validateApply: async () => {
        expect(fs.existsSync('./my_test_file')).to.be.true;

        console.log(fs.readFileSync('./my_test_file', 'utf8'));
      }
    });
  })
})
