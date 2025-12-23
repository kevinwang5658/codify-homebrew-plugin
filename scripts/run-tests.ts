import { Command } from 'commander';
import { glob } from 'glob';
import { spawn, spawnSync } from 'node:child_process';
import * as inspector from 'node:inspector';

const IP_REGEX = /VM was assigned with (.*) IP/;

const program = new Command();

program
  .argument('[file]', 'File to run')
  .action(main)
  .parse()

async function main(argument: string): Promise<void> {
  const debug = isInDebugMode();
  if (debug) {
    console.log('Running in debug mode!')
  }

  if (!argument) {
    await launchTestAll(debug)
    return process.exit(0);
  }

  await launchSingleTest(argument, debug);
  process.exit(0);
}

async function launchTestAll(debug: boolean): Promise<void> {
  const tests = await glob('./test/**/*.test.ts');
  for (const test of tests) {
    console.log(`Running test ${test}`)
    await run(`cirrus run --lazy-pull integration_individual_test_linux -e FILE_NAME="${test}" ${ debug ? '-o simple' : ''}`, debug, false)
  }

  // await run('cirrus run --lazy-pull integration_test_dev -o simple', debug, false);
}

async function launchSingleTest(test: string, debug: boolean) {
  console.log(`Running test: ${test}`)
  await run(`cirrus run --lazy-pull integration_individual_test -e FILE_NAME="${test}" -o simple`, debug)
}

async function run(cmd: string, debug: boolean, simple = true) {
  const messageBuffer: string[] = [];

  cmd += (debug ? ' -e DEBUG="--inspect-brk=9229"' : '');
  const cp = spawn(
    'source ~/.zshrc; ' + cmd,
    [],
    { stdio: simple || debug ? 'pipe' : 'inherit', shell: 'zsh' });

  cp.stderr?.on('data', data => {
    console.log(data.toString());
    messageBuffer.push(data.toString());
  });
  cp.stdout?.on('data', data => {
    console.log(data.toString());
    messageBuffer.push(data.toString());
  });

  // If debug then open ssh tunnel
  // if (debug) {
  //   cp.stdout!.on('data', data => {
  //     if (data.toString().includes('VM was assigned with')) {
  //       const [_, ip] = data.toString().match(IP_REGEX);
  //
  //       console.log(`Copying ssh keys to ${ip}`)
  //       // spawnSync(`source $HOME/.zshrc; sshpass -p admin ssh-copy-id -o "StrictHostKeyChecking=no" admin@${ip}`, { stdio: 'inherit', shell: 'zsh' });
  //
  //       console.log('Enabling port forwarding')
  //       const sshStatement1 = `ssh${ Array.from({ length: 20 }, (i: number) => i + 9000).map((i) => ` -L ${i}:localhost:${i}`)} admin@${ip}`;
  //       const sshStatement2 = `source $HOME/.zshrc; sshpass -p admin ssh -L 9221:localhost:9221 -L 9229:localhost:9229 -N -o "StrictHostKeyChecking=no" admin@${ip}`
  //
  //       const portForward1 = spawn(sshStatement2, { stdio: 'pipe', shell: 'zsh' });
  //       portForward1.stderr.pipe(process.stdout)
  //       portForward1.stdout.on('data', data => {
  //         console.log(data.toString());
  //         if (data.toString().includes('Address already in use')) {
  //           throw new Error('Port 9229 already in use!')
  //         }
  //       })
  //       // console.log('Enabled on port 9229')
  //
  //       // const portForward2 = spawn(`ssh -L 9221:localhost:9221 -Nf admin@${ip}`, { stdio: 'pipe', shell: 'zsh' });
  //       // portForward2.stdout.on('data', data => {
  //       //   console.log(data.toString());
  //       //   if (data.toString().includes('Address already in use')) {
  //       //     throw new Error('Port 9221 already in use!')
  //       //   }
  //       // });
  //       // console.log('Enabled on port 9221')
  //     }
  //   })
  // }

  return new Promise((resolve) =>
    cp.on('exit', () => resolve(messageBuffer.join('\n'))) // We never want to reject here even if the test fails
  );

}


function isInDebugMode() {
  return inspector.url() !== undefined;
}
