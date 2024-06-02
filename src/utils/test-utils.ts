import { CodifyTestUtils } from 'codify-plugin-lib';
import {
  ApplyRequestData,
  IpcMessageSchema,
  MessageCmd,
  MessageStatus,
  PlanResponseData,
  SpawnStatus,
  StringIndexedObject,
  SudoRequestData,
  SudoRequestDataSchema
} from 'codify-schemas';
import { ChildProcess, fork, spawn, SpawnOptions } from 'node:child_process';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020.default({
  strict: true
});
const ipcMessageValidator = ajv.compile(IpcMessageSchema);
const sudoRequestValidator = ajv.compile(SudoRequestDataSchema);

export class TestResourceIPC<R extends StringIndexedObject> {
  childProcess: ChildProcess

  constructor() {
    this.childProcess = fork(
      path.join(__dirname, '../../src/index.ts'),
      [],
      {
        execArgv: ['--import', 'tsx/esm'],
        env: { ...process.env },
        detached: true,
      },
    )

    this.handleSudoRequests(this.childProcess);
  }

  async plan(config: R): Promise<{ status: MessageStatus, data: PlanResponseData }> {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(this.childProcess, {
      cmd: 'plan',
      data: config,
    });

    return {
      status: result.status,
      data: result.data,
    }
  }

  async apply(data: ApplyRequestData): Promise<{ status: MessageStatus, data: string | null }> {
    const result = await CodifyTestUtils.sendMessageToProcessAwaitResponse(this.childProcess, {
      cmd: 'apply',
      data,
    });

    return {
      status: result.status,
      data: result.data,
    }
  }

  kill() {
    this.childProcess.kill();
  }

  private handleSudoRequests(process: ChildProcess) {
    // Listen for incoming sudo incoming sudo requests
    process.on('message', async (message) => {
      if (!ipcMessageValidator(message)) {
        throw new Error(`Invalid message from plugin. ${JSON.stringify(message, null, 2)}`);
      }

      console.log(message);

      if (message.cmd === MessageCmd.SUDO_REQUEST) {
        const { data } = message;
        if (!sudoRequestValidator(data)) {
          throw new Error(`Invalid sudo request from plugin. ${JSON.stringify(sudoRequestValidator.errors, null, 2)}`);
        }

        const { command, options } = data as unknown as SudoRequestData;

        console.log(`Running command with sudo: 'sudo ${command}'`)
        const result = await sudoSpawn(command, options, false);
        
        console.log(result);

        process.send({
          cmd: MessageCmd.SUDO_REQUEST + '_Response',
          data: result,
        })
      }
    })
  }
}


type CodifySpawnOptions = {
  cwd?: string;
  throws?: boolean,
} & Omit<SpawnOptions, 'detached' | 'shell' | 'stdio'>

/**
 *
* @param cmd Command to run. Ex: `rm -rf`
* @param opts Options for spawn
* @param secureMode Secure mode for sudo
* @param pluginName Optional plugin name so that stdout and stderr can be piped
*
* @see promiseSpawn
* @see spawn
*
* @returns SpawnResult { status: SUCCESS | ERROR; data: string }
*/
async function sudoSpawn(
  cmd: string,
  opts: CodifySpawnOptions,
  secureMode: boolean,
  pluginName?: string,
): Promise<{ data: string, status: SpawnStatus }> {
  return new Promise((resolve) => {
    const output: string[] = [];

    const _cmd = secureMode
      ? `sudo -k; sudo -N ${cmd}`
      : `sudo ${cmd}`;

    // Source start up shells to emulate a users environment vs. a non-interactive non-login shell script
    // Ignore all stdin
    const _process = spawn(`source ~/.zshrc; ${_cmd}`, [], {
      ...opts,
      shell: 'zsh',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const { stderr, stdout } = _process
    stdout.setEncoding('utf8');
    stderr.setEncoding('utf8');

    stdout.on('data', (data) => {
      output.push(data.toString());
    })

    stderr.on('data', (data) => {
      output.push(data.toString());
    })

    _process.on('error', (data) => {
    })

    // please node that this is not a full replacement for 'inherit'
    // the child process can and will detect if stdout is a pty and change output based on it
    // the terminal context is lost & ansi information (coloring) etc will be lost
    if (pluginName) {
      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);
    }

    _process.on('close', (code) => {
      resolve({
        data: output.join('\n'),
        status: code === 0 ? SpawnStatus.SUCCESS : SpawnStatus.ERROR,
      })
    })
  })
}
