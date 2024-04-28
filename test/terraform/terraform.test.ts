import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { TerraformConfig } from '../../src/resources/terraform/terraform.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';

describe('Terraform tests', async () => {
  let resource: TestResourceIPC<TerraformConfig>;

  beforeEach(() => {
    resource = new TestResourceIPC<TerraformConfig>();
  })

  it('Can install the latest terraform in the default location', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: "terraform"
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
      type: "terraform",
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })
  
  it('Can uninstall terraform (default)', { timeout: 300000 }, async () => {
    
    expect(await resource.apply({
      plan: {
        operation: ResourceOperation.DESTROY,
        resourceType: 'terraform',
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: "terraform",
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })
  })

  it('Can install the latest terraform in a custom location', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: "terraform",
      directory: '~/path/to/bin'
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
      type: "terraform",
      directory: '~/path/to/bin'
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  it('Can uninstall terraform (custom location)', { timeout: 300000 }, async () => {

    expect(await resource.apply({
      plan: {
        operation: ResourceOperation.DESTROY,
        resourceType: 'terraform',
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: "terraform",
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })
  })

  it('Can install the a custom version of Terraform', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: "terraform",
      version: '1.4.2',
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
      type: "terraform",
      version: '1.4.2',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  it('Can upgrade the version of Terraform', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: "terraform",
      version: '1.5.2',
    })

    expect(plan).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.RECREATE,
      }
    })

    expect(await resource.apply({ planId: plan.data.planId })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: "terraform",
      version: '1.5.2',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    })
  })

  it('Can uninstall terraform (custom version)', { timeout: 300000 }, async () => {

    expect(await resource.apply({
      plan: {
        operation: ResourceOperation.DESTROY,
        resourceType: 'terraform',
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    expect(await resource.plan({
      type: "terraform",
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
})
