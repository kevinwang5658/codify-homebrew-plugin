import { describe, it } from 'vitest';
import { Utils } from '../../utils';
import { AndroidStudioResource } from './android-studio';

describe('Android Studio unit tests', () => {
  it('Correctly parses the plist (this only works with an installed version of Android already)', async () => {
    const versions = await Utils.findApplication('Android Studio');
    const resource = new AndroidStudioResource()

    const results = await Promise.all(
      versions.map((v) => resource.addPlistData(v))
    )

    console.log(results);

  })
})
