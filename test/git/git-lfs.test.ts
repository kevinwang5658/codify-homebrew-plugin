import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestResourceIPC } from '../../src/utils/test-utils.js';
import { GitLfsConfig } from '../../src/resources/git/git-lfs.js';
import { MessageStatus, ResourceOperation } from 'codify-schemas';
import { codifySpawn } from '../../src/utils/codify-spawn.js';

describe('Git lfs integration tests', async () => {

  let resource: TestResourceIPC<GitLfsConfig>;
  
 beforeAll( async () => {
   const homebrewResource = new TestResourceIPC();
   const plan = await homebrewResource.plan({
     type: 'homebrew'
   })

   await homebrewResource.apply({
     planId: plan.data.planId,
   });
 }, 300000)

  beforeEach(() => {
    resource = new TestResourceIPC();
  })

  it('Can install git-lfs', { timeout: 300000 }, async () => {
    const plan = await resource.plan({
      type: 'git-lfs',
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
      type: 'git-lfs',
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
      data: {
        operation: ResourceOperation.NOOP,
      }
    });
  })

  // it('Can initialize git-lfs if it\'s been already installed', { timeout: 300000 }, async () => {
  //   expect(await resource.plan({
  //     type: 'git-lfs',
  //   })).toMatchObject({
  //     status: MessageStatus.SUCCESS,
  //     data: {
  //       operation: ResourceOperation.NOOP,
  //     }
  //   });
  //
  //   const uninstall = await codifySpawn('git lfs uninstall');
  //   expect(uninstall.status).to.equal(MessageStatus.SUCCESS);
  //
  //   const plan = await resource.plan({
  //     type: 'git-lfs',
  //   })
  //
  //   expect(plan).toMatchObject({
  //     status: MessageStatus.SUCCESS,
  //     data: {
  //       operation: ResourceOperation.CREATE,
  //     },
  //   })
  //
  //   expect(await resource.apply({
  //     planId: plan.data.planId,
  //   })).toMatchObject({
  //     status: MessageStatus.SUCCESS,
  //   })
  //
  //   expect(await resource.plan({
  //     type: 'git-lfs',
  //   })).toMatchObject({
  //     status: MessageStatus.SUCCESS,
  //     data: {
  //       operation: ResourceOperation.NOOP,
  //     }
  //   })
  // })

  it('Can uninstall git-lfs', async () => {
    expect(await resource.apply({
      plan: {
        resourceType: 'git-lfs',
        operation: ResourceOperation.DESTROY,
        parameters: [],
      }
    })).toMatchObject({
      status: MessageStatus.SUCCESS,
    });

    const gitLfs = await codifySpawn('git lfs', { throws: false });
    expect(gitLfs.status).to.equal(MessageStatus.ERROR);
  })

  afterEach(() => {
    resource.kill();
  })

 afterAll(async () => {
   const homebrewResource = new TestResourceIPC();

   await homebrewResource.apply({
     plan: {
       resourceType: 'homebrew',
       operation: ResourceOperation.DESTROY,
       parameters: [],
     },
   });

   homebrewResource.kill();
 }, 300000)

})
