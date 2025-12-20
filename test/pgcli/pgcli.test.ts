import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

describe('Pgcli integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install pgcli', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew' },
      { type: 'pgcli' }
    ], {
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which pgcli'), { shell: TestUtils.getShellName() })).to.not.throw();
        expect(() => execSync(TestUtils.getShellCommand('pgcli -v'), { shell: TestUtils.getShellName() })).to.not.throw();
      },
      validateDestroy: () => {
        expect(() => execSync(TestUtils.getShellCommand('which pgcli'), { shell: TestUtils.getShellName() })).to.throw();
        expect(() => execSync(TestUtils.getShellCommand('pgcli -v'), { shell: TestUtils.getShellName() })).to.throw();
      }
    })
  })
})
