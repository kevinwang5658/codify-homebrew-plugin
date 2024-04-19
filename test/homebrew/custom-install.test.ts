import { codifySpawn, SpawnStatus } from 'codify-plugin-lib';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestResourceIPC } from '../../src/utils/test-utils';
import { HomebrewConfig } from '../../src/resources/homebrew/main';

let resource: TestResourceIPC<HomebrewConfig>;

describe('Homebrew main resource integration tests', () => {
  beforeEach(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
    resource = new TestResourceIPC();
  })

  it('Creates brew in custom location', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    const result = await resource.plan({
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'glib',
        'gettext'
      ]
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
      directory: '~/.homebrew',
      formulae: [
        'glib',
        'gettext'
      ]
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  });

  it ('Can install additional casks and formulas', { timeout: 300000 }, async () => {
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
