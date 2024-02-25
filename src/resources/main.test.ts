import { expect } from 'chai';
import { ParameterOperation, ResourceOperation } from 'codify-schemas';
import { HomebrewMainResource } from './main';
import { ChangeSet, Plan } from 'codify-plugin-lib';
import { before } from 'mocha';

describe('Homebrew main resource', () => {
  before(() => {
    // Use to print logs to help with debugging
    process.env.DEBUG='codify';
  })

  it('Is add to get the current config', async () => {
    const resource = new HomebrewMainResource();

    const result = await resource.plan({
      type: 'homebrew',
      formulae: [
        'glib',
        'gettext'
      ]
    })

    console.log(JSON.stringify(result, null, 2));

    expect(result.resourceConfig).to.deep.eq({
      type: 'homebrew',
      formulae: [
        "glib",
        "gettext"
      ]
    });
    expect(result.changeSet.operation).to.eq(ResourceOperation.NOOP);
    expect(result.changeSet.parameterChanges.length).to.eq(1);
  })

  it ('removes homebrew', async () => {
    const resource = new HomebrewMainResource();

    const applyResult = await resource.applyDestroy({} as any)
    expect(applyResult).to.eq(undefined)
  })

  it ('installs homebrew to a custom dir', async () => {
    const resource = new HomebrewMainResource();

    const applyResult = await resource.applyCreate(new Plan(
      'id',
      new ChangeSet(ResourceOperation.CREATE, [{
        operation: ParameterOperation.ADD,
        name: 'directory',
        newValue: '~/homebrew',
        previousValue: null,
      }]),
      {
        type: 'homebrew',
        directory: '~/homebrew',
      })
    )
    expect(applyResult).to.eq(undefined)
    expect(process.env.HOMEBREW_PREFIX).to.be.not.null
  })
})
