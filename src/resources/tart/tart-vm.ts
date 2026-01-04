import { CreatePlan, DestroyPlan, Resource, ResourceSettings, SpawnStatus, getPty, z } from 'codify-plugin-lib';
import { OS } from 'codify-schemas';

const schema = z.object({
  sourceName: z
    .string()
    .describe('The source of the image (an OCI registry)'),
  localName: z
    .string()
    .describe('The local name of the image'),
  memory: z
    .number()
    .describe('Sets the memory of the vm in MB using tart set <vm-name> --memory')
    .optional(),
  cpu: z
    .number()
    .describe('Sets the cpu count of the vm using tart set <vm-name> --cpu')
    .optional(),
  display: z
    .string()
    .describe('Sets the display size in format <width>x<height>. For example 1200x800')
    .optional(),
  disk: z
    .string()
    .describe('The location of the disk, which is a path')
    .optional(),
  diskSize: z
    .number()
    .describe('The disk size in GB. Disk size can only be increased and not decreased')
    .optional(),
});

export type TartVmConfig = z.infer<typeof schema>;

export class TartVmResource extends Resource<TartVmConfig> {
  getSettings(): ResourceSettings<TartVmConfig> {
    return {
      id: 'tart-vm',
      operatingSystems: [OS.Darwin],
      dependencies: ['tart'],
      schema,
      parameterSettings: {
        disk: { type: 'directory' },
      },
    };
  }

  async refresh(parameters: Partial<TartVmConfig>): Promise<Partial<TartVmConfig> | null> {
    const $ = getPty();

    // Check if tart is installed
    const { status: tartStatus } = await $.spawnSafe('which tart');
    if (tartStatus !== SpawnStatus.SUCCESS) {
      return null;
    }

    // List all VMs
    const { status, data } = await $.spawnSafe('tart list --format json');
    if (status !== SpawnStatus.SUCCESS) {
      return null;
    }

    // Check if the VM exists
    // Parse the JSON output to get the list of VMs
    try {
      const vmList = JSON.parse(data);
      if (!vmList.some((vm: { Name: string }) => vm.Name === parameters.localName)) {
        return null;
      }
    } catch {
      // If JSON parsing fails, return null
      return null;
    }

    const result: Partial<TartVmConfig> = {
      localName: parameters.localName,
      sourceName: parameters.sourceName,
    }

    // Get VM configuration using tart get
    const { status: getStatus, data: getData } = await $.spawnSafe(`tart get ${parameters.localName}`);
    if (getStatus === SpawnStatus.SUCCESS) {
      // Parse the output to extract configuration
      const lines = getData.split('\n');

      for (const line of lines) {
        if (line.includes('memory:')) {
          const match = line.match(/memory:\s*(\d+)/);
          if (match) {
            result.memory = Number.parseInt(match[1], 10);
          }
        } else if (line.includes('cpu:')) {
          const match = line.match(/cpu:\s*(\d+)/);
          if (match) {
            result.cpu = Number.parseInt(match[1], 10);
          }
        } else if (line.includes('display:')) {
          const match = line.match(/display:\s*(\d+x\d+)/);
          if (match) {
            result.display = match[1];
          }
        } else if (line.includes('disk:')) {
          const match = line.match(/disk:\s*(.+)/);
          if (match) {
            result.disk = match[1].trim();
          }
        } else if (line.includes('disk-size:')) {
          const match = line.match(/disk-size:\s*(\d+)/);
          if (match) {
            result.diskSize = Number.parseInt(match[1], 10);
          }
        }
      }
    }

    return result;
  }

  async create(plan: CreatePlan<TartVmConfig>): Promise<void> {
    const $ = getPty();

    // Determine the VM name
    const vmName = plan.desiredConfig.localName || this.extractNameFromSource(plan.desiredConfig.sourceName);

    if (!vmName) {
      throw new Error('Unable to determine VM name. Please provide either "name" or a valid "sourceName"');
    }

    // Clone the VM
    await $.spawn(`tart clone ${plan.desiredConfig.sourceName} ${vmName}`, { interactive: true });

    // Set VM parameters if specified
    const setCommands: string[] = [];

    if (plan.desiredConfig.memory) {
      setCommands.push(`--memory ${plan.desiredConfig.memory}`);
    }

    if (plan.desiredConfig.cpu) {
      setCommands.push(`--cpu ${plan.desiredConfig.cpu}`);
    }

    if (plan.desiredConfig.display) {
      setCommands.push(`--display ${plan.desiredConfig.display}`);
    }

    if (plan.desiredConfig.disk) {
      setCommands.push(`--disk ${plan.desiredConfig.disk}`);
    }

    if (plan.desiredConfig.diskSize) {
      setCommands.push(`--disk-size ${plan.desiredConfig.diskSize}`);
    }

    if (setCommands.length > 0) {
      await $.spawn(`tart set ${vmName} ${setCommands.join(' ')}`, { interactive: true });
    }
  }

  async destroy(plan: DestroyPlan<TartVmConfig>): Promise<void> {
    const $ = getPty();

    // Determine the VM name
    const vmName = plan.currentConfig.localName || this.extractNameFromSource(plan.currentConfig.sourceName);

    if (!vmName) {
      throw new Error('Unable to determine VM name');
    }

    // Delete the VM
    await $.spawn(`tart delete ${vmName}`, { interactive: true });
  }

  private extractNameFromSource(sourceName: string): string {
    // Extract the name from the source
    // For example: ghcr.io/user/image:tag -> image:tag or just image
    const parts = sourceName.split('/');
    const lastPart = parts.at(-1)!;

    // Remove the tag if present
    const nameWithoutTag = lastPart.split(':')[0];

    return nameWithoutTag;
  }
}
