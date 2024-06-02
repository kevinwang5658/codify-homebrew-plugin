import { afterEach, beforeEach, describe, it } from 'vitest';
import { PluginTester } from 'codify-plugin-test';
import * as path from 'node:path';

describe('Terraform tests', async () => {
  let plugin: PluginTester;

  beforeEach(() => {
    plugin = new PluginTester(path.resolve('./src/index.ts'));
  })

  it('Can install the latest terraform in the default location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform"
    }])
  })
  
  it('Can uninstall terraform (default)', { timeout: 300000 }, async () => {
    await plugin.uninstall([{
      type: "terraform"
    }])
  })

  it('Can install the latest terraform in a custom location', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      directory: '~/path/to/bin'
    }])
  })

  it('Can uninstall terraform (custom location)', { timeout: 300000 }, async () => {
    await plugin.uninstall([{
      type: "terraform",
      directory: '~/path/to/bin'
    }])
  })

  it('Can install the a custom version of Terraform', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      version: '1.4.2',
    }])
  })

  it('Can upgrade the version of Terraform', { timeout: 300000 }, async () => {
    await plugin.fullTest([{
      type: "terraform",
      version: '1.5.2',
    }])
  })

  it('Can uninstall terraform (custom version)', { timeout: 300000 }, async () => {
    await plugin.uninstall([{
      type: "terraform",
      version: '1.5.2',
    }])
  })

  afterEach(() => {
    plugin.kill();
  })
})
