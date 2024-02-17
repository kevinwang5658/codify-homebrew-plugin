import { expect } from 'chai';
import { ResourceOperation } from '../../../../codify/codify-schemas/src';
import { spy } from 'sinon';
import { HomebrewMainResource } from './main';

describe('Homebrew main resource', () => {
  it('Plans correctly', async () => {
    const resource = new HomebrewMainResource();

    const resourceSpy = spy(resource);
    const result = await resourceSpy.plan({
      type: 'homebrew',
    })

    expect(result.resourceConfig).to.deep.eq({
      type: 'homebrew',
    });
    expect(result.changeSet.operation).to.eq(ResourceOperation.CREATE);
    expect(result.changeSet.parameterChanges.length).to.eq(0);
  })
})
