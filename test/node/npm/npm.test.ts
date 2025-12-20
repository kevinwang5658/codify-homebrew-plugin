import { describe, it, expect, beforeEach } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../../test-utils.js';

// Example test suite
describe('Npm tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can install nvm and a global package with npm',  { timeout: 500000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'nvm',
        global: '20',
        nodeVersions: ['20']
      },
      {
        type: 'npm',
        globalInstall: ['pnpm'],
      }
    ], {
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which nvm'), { shell: TestUtils.getShellName() })).to.not.throw();
        expect(execSync(TestUtils.getShellCommand('node --version'), { shell: TestUtils.getShellName() }).toString('utf-8').trim()).to.include('20');

        const installedVersions = execSync(TestUtils.getShellCommand('nvm list'), { shell: TestUtils.getShellName() }).toString('utf-8').trim();
        expect(installedVersions).to.include('20');
        expect(installedVersions).to.include('18');
      },
    });
  });
});
