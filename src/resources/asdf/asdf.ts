import { CreatePlan, DestroyPlan, Resource, ResourceSettings } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';

import { SpawnStatus, codifySpawn } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';
import AsdfSchema from './asdf-schema.json';
import { AsdfPluginsParameter } from './plugins-parameter.js';

export interface AsdfConfig extends ResourceConfig {
  plugins: string[];
}

export class AsdfResource extends Resource<AsdfConfig> {
    getSettings(): ResourceSettings<AsdfConfig> {
      return {
        id: 'asdf',
        schema: AsdfSchema,
        parameterSettings: {
          plugins: { type: 'stateful', definition: new AsdfPluginsParameter() },
        }
      }
    }

    async refresh(parameters: Partial<AsdfConfig>): Promise<Partial<AsdfConfig> | Partial<AsdfConfig>[] | null> {
      const { status } = await codifySpawn('which asdf', { throws: false });

      return status === SpawnStatus.SUCCESS ? {} : null;
    }

    async create(plan: CreatePlan<AsdfConfig>): Promise<void> {
      await codifySpawn('git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.1');

      await FileUtils.addAllToStartupFile([
        '# Asdf setup',
        '. "$HOME/.asdf/asdf.sh"',
        '# append completions to fpath',
        'fpath=(${ASDF_DIR}/completions $fpath)',
        '# initialise completions with ZSH\'s compinit',
        'autoload -Uz compinit && compinit'
      ]);
    }

    async destroy(plan: DestroyPlan<AsdfConfig>): Promise<void> {
      await FileUtils.removeLineFromZshrc('# Asdf setup')
      await FileUtils.removeLineFromZshrc('. "$HOME/.asdf/asdf.sh"');
      await FileUtils.removeLineFromZshrc('# append completions to fpath');
      await FileUtils.removeLineFromZshrc('fpath=(${ASDF_DIR}/completions $fpath)');
      await FileUtils.removeLineFromZshrc('# initialise completions with ZSH\'s compinit');
      await FileUtils.removeLineFromZshrc('autoload -Uz compinit && compinit');

      await codifySpawn('rm -rf ~/.asdf');
    }

}
