import * as child_process from 'child_process';
import { CodifyTestUtils } from '../../../codify-plugin-lib/src';
import { expect } from 'chai';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { execSync } from 'child_process';
import * as path from 'path';

describe('Homebrew main resource integration tests', () => {
  before(() => {
    chai.use(chaiAsPromised)

    verifyHomebrewNotInstalled()
  })

  it('Creates', async () => {
    console.log(path.join(__dirname, './src/index.ts'));
    const process = child_process.fork(
      path.join(__dirname, '../../src/index.ts'),
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
  expect(() => execSync('which brew')).to.throw();
}

