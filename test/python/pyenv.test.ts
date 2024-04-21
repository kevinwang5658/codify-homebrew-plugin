import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestResourceIPC } from '../../src/utils/test-utils';
import { PyenvConfig } from '../../src/resources/python/pyenv/main.js';

let resource: TestResourceIPC<PyenvConfig>;

describe('Pyenv resource integration tests', () => {
  beforeEach(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
    resource = new TestResourceIPC();
  })

  it('Installs pyenv and python', { timeout: 500000 }, async () => {
    // Plans correctly and detects that brew is not installed
    const result = await resource.plan({
      type: 'pyenv',
      pythonVersions: ['3.11']
    });
    expect(result).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.CREATE,
      }
    })
  
    expect(await resource.apply({
      planId: result.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS
    });

    // Next plan should result in no changes
    expect(await resource.plan({
      type: 'pyenv',
      pythonVersions: ['3.11']
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  });

  it ('Can install additional python versions', { timeout: 500000 }, async () => {
    const planResult = await resource.plan({
      type: 'pyenv',
      pythonVersions: ['3.11', '3.12'],
      global: '3.12',
    })
    
    expect(planResult).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.MODIFY,
      }
    });

    expect(await resource.apply({
      planId: planResult.data.planId,
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: null
    })
    
    expect(await resource.plan({
      type: 'pyenv',
      pythonVersions: ['3.11', '3.12'],
      global: '3.12'
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  it ('Can uninstall pyenv', { timeout: 30000 }, async () => {
    expect(await resource.apply({
      plan: {
        resourceType: 'pyenv',
        operation: ResourceOperation.DESTROY,
        parameters: [],
      },
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });
  })

  afterEach(() => {
    resource.kill();
  })
})
