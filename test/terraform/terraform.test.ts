import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';
import { execSync } from 'child_process';

describe('Terraform tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install the latest terraform in the default location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform"
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.not.throw();
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.throw();
      }
    })
  })

  it('Can install the latest terraform in a custom location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      directory: '~/path/to/bin'
    }], {
      validateApply: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.not.throw();
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.throw();
      }
    })
  })

  it('Can install the a custom version of Terraform', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      version: '1.4.2',
    }], {
      skipUninstall: true,
      validateApply: () => {
        expect(execSync('source ~/.zshrc; terraform -v').toString('utf-8')).to.include('1.4.2')
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.throw();
      }
    })
  })

  it('Can upgrade the version of Terraform', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      version: '1.5.2',
    }], {
      validateApply: () => {
        expect(execSync('source ~/.zshrc; terraform -v').toString('utf-8')).to.include('1.5.2')
      },
      validateDestroy: () => {
        expect(() => execSync('source ~/.zshrc; terraform -v')).to.throw();
      }
    })
  })

  afterEach(() => {
    plugin.kill();
  })
})
