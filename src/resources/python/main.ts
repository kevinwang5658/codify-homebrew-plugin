import { ParameterChange, Plan, Resource } from 'codify-plugin-lib';
import { ResourceConfig, ResourceOperation } from 'codify-schemas';

export interface PythonMainResourceConfig extends ResourceConfig {

}

export class PythonMainResource extends Resource<PythonMainResourceConfig> {
  getTypeId(): string {
    return 'python';
  }

  async validate(config: unknown): Promise<boolean> {
    return true;
  }

  async getCurrentConfig(desiredConfig: PythonMainResourceConfig): Promise<PythonMainResourceConfig | null> {
    return
  }

  calculateOperation(change: ParameterChange): ResourceOperation.MODIFY | ResourceOperation.RECREATE {
    return ResourceOperation.MODIFY
  }


  async applyCreate(plan: Plan<PythonMainResourceConfig>): Promise<void> {
  }

  async applyDestroy(plan: Plan<PythonMainResourceConfig>): Promise<void> {
  }

  async applyModify(plan: Plan<PythonMainResourceConfig>): Promise<void> {
  }

  async applyRecreate(plan: Plan<PythonMainResourceConfig>): Promise<void> {
  }

}