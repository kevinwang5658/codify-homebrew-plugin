import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { PgcliConfig } from '../../src/resources/pgcli/pgcli.js';

describe('Pgcli integration tests', async () => {

  let resource: TestResourceIPC<PgcliConfig>;

  beforeEach(() => {
    resource = new TestResourceIPC();
  })

  it('Can install pgcli', { timeout: 300000 }, async () => {
    const brewPlan = await resource.plan({
      type: 'homebrew'
    })

    const plan = await resource.plan({
      type: 'pgcli',
    })

    expect(brewPlan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    });

    expect(await resource.apply({
      planId: brewPlan.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })


    expect(await resource.apply({
      planId: plan.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    })

    expect(await resource.plan({
      type: 'pgcli',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  it('Can uninstall pgcli', async () => {
    expect(await resource.apply({
      plan: {
        resourceType: 'pgcli',
        operation: ResourceOperation.DESTROY,
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: 'pgcli'
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
