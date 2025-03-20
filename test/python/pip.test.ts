import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import fs from 'node:fs';
import os from 'node:os';
import { ResourceOperation } from 'codify-schemas';

describe('Pip resource integration tests', () => {
  const pluginPath = path.resolve('./src/index.ts');

  it('Installs python', { timeout: 500000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'pyenv',
        pythonVersions: ['3.11'],
        global: '3.11'
      },
    ], {
      skipUninstall: true,
      validateApply: () => {
        expect(execSync('source ~/.zshrc; python --version', { shell: 'zsh' }).toString()).to.include('3.11');
      }
    })
  })

  it('Installs python and installs a package using pip', { timeout: 300000 }, async () => {
    await PluginTester.fullTest(pluginPath, [
      {
        type: 'pip',
        install: [
          'ffmpeg',
          { name:  'qoverage', version:  "0.1.12"},
        ]
      }
    ], {
      skipUninstall: true,
      validatePlan: (plans) => {
        console.log(JSON.stringify(plans, null, 2))
      },
      validateApply: () => {
        const installedDependencies = execSync('source ~/.zshrc; pip list --format=json --disable-pip-version-check', { shell: 'zsh' }).toString()
        const parsed = JSON.parse(installedDependencies) as Array<{ name: string; version: string; }>;

        expect(parsed.some((p) => p.name === 'ffmpeg')).to.be.true;
        expect(parsed.some((p) => p.name === 'qoverage' && p.version === '0.1.12')).to.be.true;
      },
      testModify: {
        modifiedConfigs: [
          {
            type: 'pip',
            install: [
              'ffmpeg',
              'ansible-roster',
              { name:  'qoverage', version:  "0.1.13"},
            ]
          }
        ],
        validateModify: (plans) => {
          expect(plans.length).to.eq(1);
          const plan = plans[0];
          expect(plan).toMatchObject(  {
              "operation": "modify",
              "resourceType": "pip",
              "parameters": expect.arrayContaining([
                expect.objectContaining({
                  "name": "install",
                  "previousValue": [
                    "ffmpeg",
                    {
                      "name": "qoverage",
                      "version": "0.1.12"
                    }
                  ],
                  "newValue": [
                    "ffmpeg",
                    "ansible-roster",
                    {
                      "name": "qoverage",
                      "version": "0.1.13"
                    }
                  ],
                  "operation": "modify"
                })
              ])
            }
          )
        }
      }
    });
  });
})
