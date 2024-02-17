import * as child_process from 'child_process';
import { CodifyTestUtils } from '../../../codify-plugin-lib/src';
import { expect } from 'chai';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { execSync } from 'child_process';


describe('Homebrew main resource integration tests', () => {
  before(() => {
    chai.use(chaiAsPromised)

    verifyHomebrewNotInstalled()
  })

  it('Creates', async () => {
    const process = child_process.fork(
      './dist/index.js',
      [],
      {
        execArgv: ['-r', 'ts-node/register'],
      },
    )

    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(process, {
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
})

function verifyHomebrewNotInstalled() {
  const homebrewResponse = execSync('which brew');
  expect(homebrewResponse.toString().trim()).to.eq('brew not found')
}

