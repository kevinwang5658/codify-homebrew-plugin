import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';

describe('Multi-resource tests', async () => {
  let resource: TestResourceIPC;
  let resource2: TestResourceIPC;

  beforeEach(() => {
    resource = new TestResourceIPC()
    resource2 = new TestResourceIPC();
  })

  it('Can install git-lfs and homebrew together', { timeout: 300000 }, async () => {
    const homebrewPlan = await resource.plan({
      type: 'homebrew',
    })
    const gitlfsPlan = await resource2.plan({
      type: 'git-lfs',
    })

    expect(homebrewPlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })

    expect(gitlfsPlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })

    expect(await resource.apply({ planId: homebrewPlan.data.planId })).toMatchObject({ status: MessageStatus.SUCCESS })
    expect(await resource2.apply({ planId: gitlfsPlan.data.planId })).toMatchObject({ status: MessageStatus.SUCCESS })

    expect(await resource.plan({ type: 'homebrew' })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })

    expect(await resource2.plan({ type: 'git-lfs' })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  afterEach(() => {
    resource.kill();
    resource2.kill();
  })
})
