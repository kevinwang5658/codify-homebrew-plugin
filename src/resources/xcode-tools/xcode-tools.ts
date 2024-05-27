import { StringIndexedObject } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';
import { Plan, Resource } from 'codify-plugin-lib';
import path from 'node:path';

interface XCodeToolsConfig extends StringIndexedObject {}

export class XcodeToolsResource extends Resource<XCodeToolsConfig> {

  constructor() {
    super({
      type: 'xcode-tools',
    });
  }

  async refresh(keys: Map<string | number, unknown>): Promise<Partial<XCodeToolsConfig> | null> {
    const { status, data } = await codifySpawn('xcode-select -p', { throws: false })

    // The last check, ensures that a valid path is returned.
    if (status === SpawnStatus.ERROR || !data || path.basename(data) === data) {
      return null;
    }

    return {};
  }

  async applyCreate(plan: Plan<XCodeToolsConfig>): Promise<void> {
    await codifySpawn('touch /tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress;');

    /* Example response:
     * Finding available software
     * Software Update found the following new or updated software:
     * * Label: Command Line Tools for Xcode-15.3
     *         Title: Command Line Tools for Xcode, Version: 15.3, Size: 707501KiB, Recommended: YES,
     */
    const { data } = await codifySpawn('softwareupdate -l');

    // This regex will only match the label because it doesn't match commas.
    const labelRegex = /(Command Line Tools[^,]*[0-9]+\.[0-9]+)/g
    const xcodeToolsVersion = data.match(labelRegex);

    if (!xcodeToolsVersion || xcodeToolsVersion.length === 0 || !xcodeToolsVersion[0]) {
      return await this.attemptXcodeToolsInstall();
    }

    await codifySpawn(`softwareupdate -i "${xcodeToolsVersion[0]}" --verbose`, { requiresRoot: true });
    await codifySpawn('rm /tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress')
  }

  async applyDestroy(plan: Plan<XCodeToolsConfig>): Promise<void> {
    const { status, data: installFolder } = await codifySpawn('xcode-select -p', { throws: false });
    if (status === SpawnStatus.ERROR || !installFolder) {
      return;
    }

    // The user may have xcode tools installed through the full xcode. If this is the case then,
    // xcode tools cannot be individually be uninstalled
    if (installFolder.trim() !== '/Library/Developer/CommandLineTools') {
      console.warn('Full xcode tools install detected. Cannot uninstall just xcode tools. Skipping...');
      return;
    }

    await codifySpawn(`rm -rf /Library/Developer/CommandLineTools`, { requiresRoot: true });
  }

  private async attemptXcodeToolsInstall(): Promise<void> {
    console.warn('Unable to find installable xcode tools version. Defaulting to xcode-select --install');
    await codifySpawn('xcode-select --install');
  }
}
