import * as child_process from 'child_process';
import { codifySpawn, CodifyTestUtils, SpawnStatus } from 'codify-plugin-lib';
import { expect } from 'chai';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { ChildProcess } from 'child_process';
import * as path from 'path';
import { beforeEach } from 'mocha';
import { ResourceOperation } from 'codify-schemas';

let childProcess: ChildProcess;

describe('Homebrew main resource integration tests', () => {
  before(() => {
    chai.use(chaiAsPromised)

    // Use to print logs to help with debugging
    process.env.DEBUG='codify';

    verifyHomebrewNotInstalled()

    childProcess = child_process.fork(
      path.join(__dirname, '../../src/index.ts'),
      [],
      {
        execArgv: ['-r', 'ts-node/register'],
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

  it('Creates brew', async () => {
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

  it ('can install additional casks and formulas', async () => {
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

  after(() => {
    childProcess.kill()
  })
})

async function verifyHomebrewNotInstalled(): Promise<void> {
  await expect(() => codifySpawn('brew config', [])).to.eq(SpawnStatus.ERROR)
}

