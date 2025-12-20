import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import { TestUtils } from '../../test-utils.js';

describe('Jenv resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Installs jenv and java with homebrew', { timeout: 500000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      { type: 'homebrew' },
      {
        type: 'jenv',
        global: '17',
        add: ['17']
      }
    ], {
      validateApply: async () => {
        expect(() => execSync(TestUtils.getShellCommand('which jenv'), { shell: TestUtils.getShellName() })).to.not.throw;
        expect(() => execSync(TestUtils.getShellCommand('jenv doctor'), { shell: TestUtils.getShellName() })).to.not.throw;
        expect(execSync(TestUtils.getShellCommand('java --version'), { shell: TestUtils.getShellName() }).toString('utf-8').trim()).to.include('17')
        expect(execSync(TestUtils.getShellCommand('jenv version'), { shell: TestUtils.getShellName() }).toString('utf-8').trim()).to.include('17')
      },
      testModify: {
        modifiedConfigs: [{
          type: 'jenv',
          global: '21',
          add: ['17', '21']
        }],
        validateModify: () => {
          expect(() => execSync(TestUtils.getShellCommand('which jenv'), { shell: TestUtils.getShellName() })).to.not.throw;
          expect(execSync(TestUtils.getShellCommand('java --version'), { shell: TestUtils.getShellName() }).toString('utf-8').trim()).to.include('21')

          const jenvVersions = execSync(TestUtils.getShellCommand('jenv versions'), { shell: TestUtils.getShellName() }).toString('utf-8').trim()
          expect(jenvVersions).to.include('21')
          expect(jenvVersions).to.include('17')
        }
      },
      validateDestroy: () => {
        expect(() => execSync(TestUtils.getShellCommand('which jenv'), { shell: TestUtils.getShellName() })).to.throw;
        expect(() => execSync(TestUtils.getShellCommand('which java'), { shell: TestUtils.getShellName() })).to.throw;
      }
    });
  });
})
