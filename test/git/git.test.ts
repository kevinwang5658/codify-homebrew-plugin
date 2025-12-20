import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { TestUtils } from '../test-utils.js';

describe('Git integration tests', async () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Can add global user name and email', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'git',
        username: 'test',
        email: 'test@test.com'
      }
    ], {
      skipUninstall: true,
      validateApply: async () => {
        const email = execSync(TestUtils.getShellCommand('git config --global user.email'))
        expect(email.toString('utf-8').trim()).to.equal('test@test.com')

        const username = execSync(TestUtils.getShellCommand('git config --global user.name'))
        expect(username.toString('utf-8').trim()).to.equal('test')
      }
    });
  })

  it('Can modify git user name and email', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'git',
        username: 'test2',
        email: 'test2@test.com'
      }
    ], {
      // Set true here because git resource cannot be destroyed right now
      skipUninstall: true,
      validateApply: async () => {
        const email = execSync(TestUtils.getShellCommand('git config --global user.email'))
        expect(email.toString('utf-8').trim()).to.equal('test2@test.com')

        const username = execSync(TestUtils.getShellCommand('git config --global user.name'))
        expect(username.toString('utf-8').trim()).to.equal('test2')
      }
    });
  })
})
