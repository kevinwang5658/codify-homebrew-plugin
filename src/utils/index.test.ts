import { describe, expect, it } from 'vitest';

import { Utils } from './index.js';

describe('Utils tests', () => {
  it('Can find notes app', async () => {
    const locations = await Utils.findApplication('Notes.app')
    expect(locations.length).to.be.greaterThan(0);
  })
})
