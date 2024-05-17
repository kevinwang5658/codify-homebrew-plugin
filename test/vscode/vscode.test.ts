import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { MessageStatus, ParameterOperation, ResourceOperation } from 'codify-schemas';
import { codifySpawn } from 'codify-plugin-lib';
import { VscodeConfig } from '../../src/resources/vscode/vscode.js';

describe('Vscode integration tests', async () => {

  let resource: TestResourceIPC<VscodeConfig>;

  beforeEach(() => {
    resource = new TestResourceIPC();
  })

  it('Can install vscode', { timeout: 300000 }, async () => {
    await codifySpawn('sudo mdutil -i on /Applications')

    const plan = await resource.plan({
      type: 'vscode',
      directory: '/Applications'
    })

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({
      planId: plan.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'vscode',
      directory: '/Applications'
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  it('Can uninstall vscode', async () => {
    expect(await resource.apply({
      plan: {
        resourceType: 'vscode',
        operation: ResourceOperation.DESTROY,
        parameters: [{
          name: 'directory',
          operation: ParameterOperation.REMOVE,
          previousValue: '/Applications',
          newValue: null,
        }],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: 'vscode',
      directory: '/Applications'
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });
  })

  afterEach(() => {
    resource.kill();
  })

})
