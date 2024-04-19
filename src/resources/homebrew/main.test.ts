import { ResourceOperation } from 'codify-schemas';
import { HomebrewMainResource } from './main.js';
import { beforeEach, describe, expect, it } from 'vitest'

describe('Homebrew main resource', () => {
  beforeEach(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
  })

//   it('Is add to get the current config', async () => {
//     const resource = new HomebrewMainResource();
//
//     const result = await resource.plan({
//       type: 'homebrew',
//       formulae: [
//         'glib',
//         'gettext'
//       ]
//     })
//
//     console.log(JSON.stringify(result, null, 2));
//
//     expect(result.resourceConfig).to.deep.eq({
//       type: 'homebrew',
//       formulae: [
//         "glib",
//         "gettext"
//       ]
//     });
//     expect(result.changeSet.operation).to.eq(ResourceOperation.NOOP);
//     expect(result.changeSet.parameterChanges.length).to.eq(1);
//   })

  it ('removes homebrew', async () => {
    const resource = new HomebrewMainResource();

    const applyResult = await resource.applyDestroy({} as any)
    expect(applyResult).to.eq(undefined)
  })

//   it ('installs homebrew to a custom dir', async () => {
//     const resource = new HomebrewMainResource();
//
//     const applyResult = await resource.applyCreate(new Plan(
//       'id',
//       new ChangeSet(ResourceOperation.CREATE, [{
//         operation: ParameterOperation.ADD,
//         name: 'directory',
//         newValue: '~/homebrew',
//         previousValue: null,
//       }]),
//       {
//         type: 'homebrew',
//         directory: '~/homebrew',
//       })
//     )
//     expect(applyResult).to.eq(undefined)
//     expect(process.env.HOMEBREW_PREFIX).to.be.not.null
//   })

  it('test', { timeout: 300000 }, async () => {
    const resource = new HomebrewMainResource();

    // Plans correctly and detects that brew is not installed
    const result = await resource.plan({
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv'
      ]
    });

    console.log(result);
    expect(result).toMatchObject({
      changeSet: {
        operation: ResourceOperation.CREATE
      }
    })

    // Installs brew
    await resource.apply(result);

    // Next plan should result in no changes
    expect(await resource.plan({
      type: 'homebrew',
      directory: '~/.homebrew',
      formulae: [
        'jenv'
      ]
    })).toMatchObject({
      changeSet: {
        operation: ResourceOperation.NOOP
      }
    });
  });
})
