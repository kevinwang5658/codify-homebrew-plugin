import { describe, it } from 'vitest';

import { Utils } from './index.js';

describe('Utils tests', () => {
  it('Can find notes app', async () => {
    const locations = await Utils.findApplication('Android')
    console.log(locations)
  })
})
