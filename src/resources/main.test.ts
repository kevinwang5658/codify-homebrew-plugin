import { expect } from 'chai';
import { ResourceOperation } from 'codify-schemas';
import { HomebrewMainResource } from './main';

describe('Homebrew main resource', () => {
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
})
