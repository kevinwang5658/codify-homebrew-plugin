import * as child_process from 'child_process';
import { CodifyTestUtils } from '../../../codify-plugin-lib/src';
import { expect } from 'chai';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import { codifySpawn, isDebug } from '../../../codify-plugin-lib';
import { beforeEach } from 'mocha';

let childProcess: ChildProcess;

describe('Homebrew main resource integration tests', () => {
  before(() => {
    chai.use(chaiAsPromised)
    process.env.DEBUG='codify';

    verifyHomebrewNotInstalled()
  })

  beforeEach(() => {
    childProcess = child_process.fork(
      path.join(__dirname, '../../src/index.ts'),
      [],
      {
        execArgv: ['-r', 'ts-node/register'],
      },
    )
  })

  it('Creates', async () => {
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

    // const applyResult = await CodifyTestUtils.sendMessageToProcessAwaitResponse(process, {
    //   cmd: 'apply',
    //   data: {
    //     planId: result.data.planId,
    //   }
    // })
    //
    // console.log(applyResult);
  })

  afterEach(() => {
    childProcess.kill()
  })
})

async function verifyHomebrewNotInstalled(): Promise<void> {
  //await expect(() => codifySpawn('brew config', [])).to.eventually.throw();
}

