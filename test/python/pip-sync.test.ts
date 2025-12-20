import { PluginTester } from 'codify-plugin-test';
import { ResourceOperation } from 'codify-schemas';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestUtils } from '../test-utils.js';

describe('Pip-sync resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Installs python', { timeout: 500_000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'pyenv',
        pythonVersions: ['3.11'],
        global: '3.11'
      },
    ], {
      skipUninstall: true,
      validateApply() {
        expect(execSync(TestUtils.getShellCommand('python --version'), { shell: TestUtils.getShellName() }).toString()).to.include('3.11');
      }
    })
  })

  it('Installs python and installs packages via pip-sync (in venv)', { timeout: 300_000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        'type': 'git-repository',
        'directory': '~/Projects/example-project2',
        'repository': 'https://github.com/daniel-dqsdatalabs/python-template.git'
      },
      {
        'type': 'venv-project',
        'envDir': '.venv',
        'cwd': '~/Projects/example-project2',
        'dependsOn': ['git-repository']
      },
      {
        'type': 'pip-sync',
        'cwd': '~/Projects/example-project2',
        'requirementFiles': ['requirements.txt', 'dev-requirements.txt'],
        'virtualEnv': '.venv',
        'dependsOn': ['venv-project']
      },
    ], {
      skipUninstall: true,
      validatePlan(plans) {
        console.log(JSON.stringify(plans, null, 2))
      },
      validateApply() {},
    });
  });
})
