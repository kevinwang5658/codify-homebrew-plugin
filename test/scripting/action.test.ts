import { beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import path from 'node:path';
import { ResourceOperation } from 'codify-schemas';
import fs from 'node:fs';
import os from 'node:os';

describe('Action tests', () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can run an action if the condition returns as non-zero', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'action', condition: '[ -d ~/tmp ]', action: 'mkdir ~/tmp; touch ~/tmp/testFile' }
    ], {
      skipUninstall: true,
      validateApply: (plans) => {
        expect(plans[0]).toMatchObject({
          operation: ResourceOperation.CREATE,
        })

        const dir = fs.readdirSync(path.resolve(os.homedir(), 'tmp'))
        expect(dir[0]).to.eq('testFile')
      }
    })
  })

  it('It will return NO-OP when the return is 0', { timeout: 300000 }, async () => {
    await plugin.fullTest([
      { type: 'action', condition: 'exit 0;', action: 'mkdir ~/tmp; touch ~/tmp/testFile' }
    ], {
      skipUninstall: true,
      validatePlan: (plans) => {
        expect(plans[0]).toMatchObject({
          operation: ResourceOperation.NOOP,
        })
      }
    })
  })

  it('It can use the cwd parameter to run all commands from a specific directory', { timeout: 300000 }, async () => {
    fs.mkdirSync(path.resolve(os.homedir(), 'tmp2'))
    await plugin.fullTest([
      { type: 'action', condition: '[ -e testFile ]', action: 'touch testFile', cwd: '~/tmp2' }
    ], {
      skipUninstall: true,
      validatePlan: (plans) => {
        expect(plans[0]).toMatchObject({
          operation: ResourceOperation.CREATE,
        })
      }
    })

    expect(fs.existsSync(path.resolve(os.homedir(), 'tmp2', 'testFile'))).to.be.true;

    await plugin.fullTest([
      { type: 'action', condition: '[ -e testFile ]', action: 'touch testFile', cwd: '~/tmp2' }
    ], {
      skipUninstall: true,
      validatePlan: (plans) => {
        expect(plans[0]).toMatchObject({
          operation: ResourceOperation.NOOP,
        })
      }
    })
  })
})
