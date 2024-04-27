import { codifySpawn, SpawnStatus } from 'codify-plugin-lib';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestResourceIPC } from '../../src/utils/test-utils';
import { HomebrewConfig } from '../../src/resources/homebrew/homebrew.js';

let resource: TestResourceIPC<HomebrewConfig>;

describe('Homebrew custom install integration tests', () => {
  beforeEach(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
    resource = new TestResourceIPC();
  })

  it ('Creates brew in a custom location', { timeout: 300000 }, async () => {
    const planResult = await resource.plan({
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    })
    
    expect(planResult).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({
      planId: planResult.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: null
    })
    
    expect(await resource.plan({
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv',
      ],
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  it ('Can uninstall brew', { timeout: 30000 }, async () => {
    expect(await resource.apply({
      plan: {
        resourceType: 'homebrew',
        operation: ResourceOperation.DESTROY,
        parameters: [],
      },
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });
  })

  afterEach(() => {
    resource.kill();
  })
})

async function verifyHomebrewNotInstalled(): Promise<void> {
  expect((await codifySpawn('brew config', [], { throws: false })).status).to.eq(SpawnStatus.ERROR)
}
