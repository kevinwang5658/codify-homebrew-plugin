import { Resource, ResourceSettings } from 'codify-plugin-lib';
import { StringIndexedObject } from 'codify-schemas';
import path from 'node:path';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';

interface XCodeToolsConfig extends StringIndexedObject {}

export class XcodeToolsResource extends Resource<XCodeToolsConfig> {

  getSettings(): ResourceSettings<XCodeToolsConfig> {
    return {
      id: 'xcode-tools',
    }
  }

  override async refresh(): Promise<Partial<XCodeToolsConfig> | null> {
    const { data, status } = await codifySpawn('xcode-select -p', { throws: false })

    // The last check, ensures that a valid path is returned.
    if (status === SpawnStatus.ERROR || !data || path.basename(data) === data) {
      return null;
    }

    return {};
  }

  override async create(): Promise<void> {
    await codifySpawn('touch /tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress;');

    try {
      /* Example response:
       * Finding available software
       * Software Update found the following new or updated software:
       * * Label: Command Line Tools for Xcode-15.3
       *         Title: Command Line Tools for Xcode, Version: 15.3, Size: 707501KiB, Recommended: YES,
       */
      const { data } = await codifySpawn('softwareupdate -l');

      // This regex will only match the label because it doesn't match commas.
      const labelRegex = /(Command Line Tools[^,]*\d+\.\d+)/g
      const xcodeToolsVersion = data.match(labelRegex);

      if (!xcodeToolsVersion || xcodeToolsVersion.length === 0 || !xcodeToolsVersion[0]) {
        return await this.attemptGUIInstall();
      }

      await codifySpawn(`softwareupdate -i "${xcodeToolsVersion[0]}" --verbose`, { requiresRoot: true });

    } finally {
      await codifySpawn('rm /tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress')
    }
  }

  override async destroy(): Promise<void> {
    const { data: installFolder, status } = await codifySpawn('xcode-select -p', { throws: false });
    if (status === SpawnStatus.ERROR || !installFolder) {
      return;
    }

    // The user may have xcode tools installed through the full xcode. If this is the case then,
    // xcode tools cannot be individually be uninstalled
    if (installFolder.trim() !== '/Library/Developer/CommandLineTools') {
      console.warn('Full xcode tools install detected. Cannot uninstall just xcode tools. Skipping...');
      return;
    }

    await codifySpawn('rm -rf /Library/Developer/CommandLineTools', { requiresRoot: true });
  }

  private async attemptGUIInstall(): Promise<void> {
    console.warn('Unable to find installable xcode tools version. Defaulting to xcode-select --install');
    await codifySpawn('xcode-select --install');
  }
}
