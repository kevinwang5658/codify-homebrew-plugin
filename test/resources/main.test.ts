import * as child_process from 'child_process';
import { ChildProcess } from 'child_process';
import { codifySpawn, CodifyTestUtils, SpawnStatus } from 'codify-plugin-lib';
import * as path from 'path';
import { ResourceOperation } from 'codify-schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let childProcess: ChildProcess;

describe('Homebrew main resource integration tests', () => {
  beforeAll(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';

    verifyHomebrewNotInstalled()

    childProcess = child_process.fork(
      path.join(__dirname, '../../src/index.ts'),
      [],
      {
        execArgv: ['--import', 'tsx/esm'],
      },
    )
  })

  it('Plans properly with an empty instances', async () => {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'plan',
      data: {
        type: 'homebrew',
      },
    })

    expect(result).to.deep.eq(
      {
        cmd: 'plan_Response',
        status: 'success',
        data: {
          planId: result.data.planId,
          operation: 'create',
          resourceType: 'homebrew',
          parameters: []
        }
      }
    )
  })

  it('Creates brew', { timeout: 300000 }, async () => {
    // Plans correctly and detects that brew is not installed
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'plan',
      data: {
        type: 'homebrew',
        formulae: [
          'glib',
          'gettext'
        ]
      },
    })
    console.log(result);

    expect(result).to.deep.eq(
      {
        cmd: 'plan_Response',
        status: 'success',
        data: {
          ...result.data,
          operation: ResourceOperation.CREATE,
        }
      }
    )

    // Installs brew
    const applyResult = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'apply',
      data: {
        planId: result.data.planId,
      }
    })

    console.log(applyResult);
    expect(applyResult).to.deep.eq(
      {
        cmd: 'apply_Response',
        status: 'success',
        data: null
      }
    )

    // Next plan should result in no changes
    const resultAfter = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'plan',
      data: {
        type: 'homebrew',
        formulae: [
          'glib',
          'gettext'
        ]
      },
    })
    expect(resultAfter).to.deep.eq(
      {
        cmd: 'plan_Response',
        status: 'success',
        data: {
          ...resultAfter.data,
          operation: ResourceOperation.NOOP,
        }
      }
    )
  })

  it ('can install additional casks and formulas', { timeout: 300000 }, async () => {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'plan',
      data: {
        type: 'homebrew',
        formulae: [
          'glib',
          'gettext',
          'jenv',
        ],
        casks: [
          'warp'
        ]
      },
    })
    expect(result).to.deep.eq(
      {
        cmd: 'plan_Response',
        status: 'success',
        data: {
          ...result.data,
          operation: ResourceOperation.MODIFY,
        }
      }
    )

    const applyResult = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'apply',
      data: {
        planId: result.data.planId,
      }
    })
    expect(applyResult).to.deep.eq(
      {
        cmd: 'apply_Response',
        status: 'success',
        data: null
      }
    )

    const resultAfter = await CodifyTestUtils.sendMessageToProcessAwaitResponse(childProcess, {
      cmd: 'plan',
      data: {
        type: 'homebrew',
        formulae: [
          'glib',
          'gettext',
          'jenv',
        ],
        casks: [
          'warp'
        ]
      },
    })
    expect(resultAfter).to.deep.eq(
      {
        cmd: 'plan_Response',
        status: 'success',
        data: {
          ...resultAfter.data,
          operation: ResourceOperation.NOOP,
        }
      }
    )
  })

  afterAll(() => {
    childProcess.kill()
  })
})

async function verifyHomebrewNotInstalled(): Promise<void> {
  await expect((await codifySpawn('brew config', [], { throws: false })).status).to.eq(SpawnStatus.ERROR)
}
