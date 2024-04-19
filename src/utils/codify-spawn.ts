import { spawn, SpawnOptions } from 'node:child_process';

export enum SpawnStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface SpawnResult {
  status: SpawnStatus,
  data: string;
}

type CodifySpawnOptions = {
  cwd?: string;
  stdioString?: boolean;
} & SpawnOptions

/**
*
* @param cmd Command to run. Ex: `rm -rf`
* @param args Optional additional arguments to append
* @param opts Standard options for node spawn. Additional argument:
* throws determines if a shell will throw a JS error. Defaults to true
*
* @see promiseSpawn
* @see spawn
*
* @returns SpawnResult { status: SUCCESS | ERROR; data: string }
*/
export async function codifySpawn(
  cmd: string,
  args?: string[],
  opts?: Omit<CodifySpawnOptions, 'stdio' | 'stdioString'> & { throws?: boolean },
): Promise<SpawnResult> {
  try {
    // TODO: Need to benchmark the effects of using sh vs zsh for shell.
    //  Seems like zsh shells run slower
    const result = await internalSpawn(
      cmd,
      args ?? [],
      opts,
    );
    
    if (result.status !== SpawnStatus.SUCCESS && opts?.throws === true) {
      throw new Error(result.data);
    }

    return result;
  } catch (error) {
    const shouldThrow = opts?.throws ?? true;
    if (isDebug() || shouldThrow) {
      console.error(`CodifySpawn Error for command ${cmd} ${args}`, error);
    }

    if (shouldThrow) {
      throw error;
    }

    return {
      status: SpawnStatus.ERROR,
      data: error as string,
    }
  }
}

async function internalSpawn(command: string, args: string[], opts: any): Promise<{ status: SpawnStatus, data: string }>  {
  return new Promise((resolve, reject) => {
    const output: string[] = []
    
    const _process = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: 'zsh',
      ...opts
    })
    
    const { stdout, stderr } = _process
    stdout.setEncoding('utf8');
    stderr.setEncoding('utf8');
    
    // please node that this is not a full replacement for 'inherit'
    // the child process can and will detect if stdout is a pty and change output based on it
    // the terminal context is lost & ansi information (coloring) etc will be lost
    if (stdout && stderr) {
      stdout.pipe(process.stdout)
      stderr.pipe(process.stderr)
    }
    
    stdout.on('data', (data) => {
      output.push(data.toString());
    })
    
    stderr.on('data', (data) => {
      output.push(data.toString());
    })

    _process.on('close', (code) => {
      resolve({
        status: code === 0 ? SpawnStatus.SUCCESS : SpawnStatus.ERROR,
        data: output.join('\n'),
      })
    })
  })
}

export function isDebug(): boolean {
  return process.env.DEBUG != null && process.env.DEBUG.includes('codify'); // TODO: replace with debug library
}