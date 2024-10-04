import { CreatePlan, DestroyPlan, Resource, ResourceSettings } from 'codify-plugin-lib';
import { ResourceConfig } from 'codify-schemas';
import { codifySpawn, SpawnStatus } from '../../utils/codify-spawn.js';
import { FileUtils } from '../../utils/file-utils.js';

export interface AsdfConfig extends ResourceConfig {
}

export class AsdfResource extends Resource<AsdfConfig> {
    getSettings(): ResourceSettings<AsdfConfig> {
      return {
        id: 'asdf'
      }
    }

    async refresh(parameters: Partial<AsdfConfig>): Promise<Partial<AsdfConfig> | Partial<AsdfConfig>[] | null> {
      const { status } = await codifySpawn('asdf', { throws: false });

      return status === SpawnStatus.SUCCESS ? {} : null;
    }

    async create(plan: CreatePlan<AsdfConfig>): Promise<void> {
      await codifySpawn('git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.1');

      await FileUtils.addToStartupFile('# Asdf setup')
      await FileUtils.addToStartupFile('. "$HOME/.asdf/asdf.sh"');
      await FileUtils.addToStartupFile('# append completions to fpath');
      await FileUtils.addToStartupFile('fpath=(${ASDF_DIR}/completions $fpath)')
      await FileUtils.addToStartupFile('# initialise completions with ZSH\'s compinit')
      await FileUtils.addToStartupFile('autoload -Uz compinit && compinit')
    }

    async destroy(plan: DestroyPlan<AsdfConfig>): Promise<void> {
      await FileUtils.removeLineFromZshrc('# Asdf setup')
      await FileUtils.removeLineFromZshrc('. "$HOME/.asdf/asdf.sh"');
      await FileUtils.removeLineFromZshrc('# append completions to fpath');
      await FileUtils.removeLineFromZshrc('fpath=(${ASDF_DIR}/completions $fpath)')
      await FileUtils.removeLineFromZshrc('# initialise completions with ZSH\'s compinit')
      await FileUtils.removeLineFromZshrc('autoload -Uz compinit && compinit')

      await codifySpawn('rm -rf ~/.asdf');
    }

}
