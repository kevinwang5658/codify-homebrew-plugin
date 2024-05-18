import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { AwsCliConfig } from '../../src/resources/aws-cli/cli/aws-cli.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { HomebrewConfig } from '../../src/resources/homebrew/homebrew.js';

describe('Test aws-cli', async () => {
  let homebrew: TestResourceIPC<HomebrewConfig>;
  let resource: TestResourceIPC<AwsCliConfig>;

  beforeAll(async () => {
    homebrew = new TestResourceIPC<HomebrewConfig>();
    const plan = await homebrew.plan({
      type: 'homebrew'
    })

    await homebrew.apply({ planId: plan.data.planId, });
  }, 300000)

  beforeEach(() => {
    resource = new TestResourceIPC<AwsCliConfig>();
  })

  it('Can install aws-cli', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: 'aws-cli',
    })

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({ planId: plan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'aws-cli',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })
  
  it('Can un-install aws-cli', { timeout: 300000 }, async () => {
    expect(await resource.apply({
      plan: {
        operation: ResourceOperation.DESTROY,
        resourceType: 'aws-cli',
        parameters: []
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'aws-cli',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })
  })

  afterEach(() => {
    resource.kill();
  })

  afterAll(() => {
    homebrew.kill();
  })
})
