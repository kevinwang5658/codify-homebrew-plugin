import { codifySpawn, SpawnStatus } from 'codify-plugin-lib';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestResourceIPC } from '../../src/utils/test-utils';
import { HomebrewConfig } from '../../src/resources/homebrew/homebrew.js';

let resource: TestResourceIPC<HomebrewConfig>;

describe('Homebrew main resource integration tests', () => {
  beforeEach(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
    resource = new TestResourceIPC();
  })

  it('Can install homebrew and add a tap', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    const result = await resource.plan({
      type: 'homebrew',
      taps: ['cirruslabs/cli'],
    });
    expect(result).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })

    // Installs brew
    expect(await resource.apply({
      planId: result.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS
    });

    // Next plan should result in no changes
    expect(await resource.plan({
      type: 'homebrew',
      taps: ['cirruslabs/cli'],
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  });

  it ('Can install additional taps', { timeout: 300000 }, async () => {
    const planResult = await resource.plan({
      type: 'homebrew',
      taps: ['cirruslabs/cli', 'hashicorp/tap'],
    })
    
    expect(planResult).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.MODIFY,
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
      taps: ['cirruslabs/cli', 'hashicorp/tap'],
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  afterEach(() => {
    resource.kill();
  })
})

async function verifyHomebrewNotInstalled(): Promise<void> {
  expect((await codifySpawn('brew config', [], { throws: false })).status).to.eq(SpawnStatus.ERROR)
}
