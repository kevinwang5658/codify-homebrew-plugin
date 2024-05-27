import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';

describe('XCode tools install tests', async () => {
  let resource: TestResourceIPC<any>;

  beforeEach(() => {
    resource = new TestResourceIPC<any>();
  })

  it('Can uninstall xcode tools', { timeout: 300000 }, async () => {
    expect(await resource.apply({
      plan: {
        operation: ResourceOperation.DESTROY,
        resourceType: 'xcode-tools',
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: 'xcode-tools',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })
  })
  
  it('Can install xcode tools', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: 'xcode-tools',
    })

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })

    expect(await resource.apply({ planId: plan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: 'xcode-tools',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  afterEach(() => {
    resource.kill();
  })
})
