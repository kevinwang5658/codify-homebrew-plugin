import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';
import { TestUtils } from '../test-utils.js';

const pluginPath = path.resolve('./src/index.ts');

describe('Terraform tests', async () => {

  // it('Can install the latest terraform in the default location', { timeout: 300000 }, async () => {
  //   await PluginTester.fullTest(pluginPath, [{
  //     type: "terraform"
  //   }], {
  //     validateApply: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.not.throw();
  //     },
  //     validateDestroy: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.throw();
  //     }
  //   })
  // })
  //
  // it('Can install the latest terraform in a custom location', { timeout: 300000 }, async () => {
  //   await PluginTester.fullTest(pluginPath, [{
  //     type: "terraform",
  //     directory: '~/path/to/bin'
  //   }], {
  //     validateApply: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.not.throw();
  //     },
  //     validateDestroy: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.throw();
  //     }
  //   })
  // })
  //
  // it('Can install the a custom version of Terraform', { timeout: 300000 }, async () => {
  //   await PluginTester.fullTest(pluginPath, [{
  //     type: "terraform",
  //     version: '1.4.2',
  //   }], {
  //     skipUninstall: true,
  //     validateApply: () => {
  //       expect(execSync(TestUtils.getShellCommand('terraform -v')).toString('utf-8')).to.include('1.4.2')
  //     },
  //     validateDestroy: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.throw();
  //     }
  //   })
  // })
  //
  // it('Can upgrade the version of Terraform', { timeout: 300000 }, async () => {
  //   await PluginTester.fullTest(pluginPath, [{
  //     type: "terraform",
  //     version: '1.5.2',
  //   }], {
  //     validateApply: () => {
  //       expect(execSync(TestUtils.getShellCommand('terraform -v')).toString('utf-8')).to.include('1.5.2')
  //     },
  //     validateDestroy: () => {
  //       expect(() => execSync(TestUtils.getShellCommand('terraform -v'))).to.throw();
  //     }
  //   })
  // })
})
