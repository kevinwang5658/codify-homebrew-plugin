import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs';
import os from 'node:os';
import { TestUtils } from '../test-utils.js';

describe('Pyenv resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Installs pyenv and python (this installs on a clean system without readline, openSSL, etc.)', { timeout: 500000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'pyenv',
        pythonVersions: ['3.11']
      }
    ], {
      skipUninstall: true,
      validateApply: () => {
        expect(() => execSync(TestUtils.getShellCommand('which pyenv'), { shell: TestUtils.getShellName() })).to.not.throw();
      }
    });
  });

  it ('Can install additional python versions. (this installs after openSSL and readline have been installed)', { timeout: 700000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'homebrew',
        formulae: ['readline', 'openssl@3']
      },
      {
        type: 'pyenv',
        pythonVersions: ['3.11', '3.12'],
        global: '3.12',
      }
    ], {
      validateApply: () => {
        expect(execSync(TestUtils.getShellCommand('python --version'), { shell: TestUtils.getShellName() }).toString('utf-8')).to.include('3.12');

        const versions = execSync(TestUtils.getShellCommand('pyenv versions'), { shell: TestUtils.getShellName() }).toString('utf-8')
        expect(versions).to.include('3.12')
        expect(versions).to.include('3.11')
      },
      validateDestroy: () => {
        expect(fs.existsSync(path.resolve(os.homedir(), '.pyenv'))).to.be.false;
        expect(fs.readFileSync(TestUtils.getPrimaryShellRc(), 'utf-8')).to.not.contain('pyenv');
        expect(() => execSync(TestUtils.getShellCommand('which pyenv'), { shell: TestUtils.getShellName() })).to.throw();
      }
    })
  })
})
