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
  opts?: Omit<CodifySpawnOptions, 'stdio' | 'stdioString'> & { throws?: boolean },
): Promise<SpawnResult> {
  const throws = opts?.throws ?? true;

  if (isDebug()) {
    console.log(`Running command: ${cmd}`)
  }

  try {
    // TODO: Need to benchmark the effects of using sh vs zsh for shell.
    //  Seems like zsh shells run slower
    const result = await internalSpawn(
      cmd,
      opts,
    );
    
    if (result.status !== SpawnStatus.SUCCESS) {
      throw new Error(result.data);
    }

    return result;
  } catch (error) {

    if (isDebug()) {
      console.error(`CodifySpawn error for command ${cmd}`, error);
    }

    if (throws) {
      throw error;
    }

    if (error instanceof Error) {
      return {
        status: SpawnStatus.ERROR,
        data: error.message,
      }
    }

    return {
      status: SpawnStatus.ERROR,
      data: error + '',
    }
  }
}

async function internalSpawn(cmd: string, opts: any): Promise<{ status: SpawnStatus, data: string }>  {
  return new Promise((resolve, reject) => {
    const output: string[] = []

    const _process = spawn(cmd, [], {
      ...opts,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: 'zsh',
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

    _process.on('error', (data) => {})

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
