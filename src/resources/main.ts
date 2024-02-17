import { ChangeSet, ParameterChange, Resource } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';

export interface HomebrewConfig extends ResourceConfig {
  type: string,
  name?: string,
}

export class HomebrewMainResource extends Resource<HomebrewConfig> {

  getTypeId(): string {
    return 'homebrew';
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.RECREATE
  }

  async getCurrentConfig(): Promise<HomebrewConfig | null> {
    return null
  }

  async validate(config: HomebrewConfig): Promise<boolean> {
    return Promise.resolve(false);
  }

  async applyCreate(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyDestroy(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyModify(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

  async applyRecreate(changeSet: ChangeSet): Promise<void> {
    return Promise.resolve(undefined);
  }

}
