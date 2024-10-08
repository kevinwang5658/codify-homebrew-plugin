import { Command } from 'commander';
import { glob } from 'glob';
import { spawn, spawnSync } from 'node:child_process';

const IP_REGEX = /VM was assigned with (.*) IP/;

const program = new Command();

program
  .option('--debug')
  .argument('[file]', 'File to run')
  .action(main)
  .parse()

async function main(argument: string, options: Record<string, any>): Promise<void> {
  if (!argument) {
    await launchTestAll(options.debug)
    return process.exit(0);
  }

  await launchSingleTest(argument, options.debug);
  process.exit(0);
}

async function launchTestAll(debug: boolean): Promise<void> {
  const tests = await glob('./test/**/*.test.ts');
  for (const test of tests) {
    console.log(`Running test ${test}`)
    await run(`cirrus run --lazy-pull integration_individual_test -e FILE_NAME="${test}" -o simple`, debug)
  }
}

async function launchSingleTest(test: string, debug: boolean) {
  console.log(`Running test: ${test}`)
  await run(`cirrus run --lazy-pull integration_individual_test -e FILE_NAME="${test}" -o simple`, debug)
}

async function run(cmd: string, debug: boolean) {
  const messageBuffer: string[] = [];

  console.log()
  const cp = spawn(
    'source ~/.zshrc; ' + cmd,
    [],
    { stdio: 'pipe', shell: 'zsh' });

  cp.stderr.on('data', data => {
    console.log(data.toString());
    messageBuffer.push(data.toString());
  });
  cp.stdout.on('data', data => {
    console.log(data.toString());
    messageBuffer.push(data.toString());
  });

  // If debug then open ssh tunnel
  if (debug) {
    cp.stdout.on('data', data => {
      if (data.toString().includes('VM was assigned with')) {
        const [_, ip] = data.toString().match(IP_REGEX);

        console.log(`Copying ssh keys to ${ip}`)
        spawnSync(`source $HOME/.zshrc; sshpass -p admin ssh-copy-id -o "StrictHostKeyChecking=no" admin@${ip}`, { stdio: 'inherit', shell: 'zsh' });

        console.log('Enabling port forwarding')
        const portForward = spawn(`ssh -L 9229:localhost:9229 -Nf admin@${ip}`, { stdio: 'pipe', shell: 'zsh' });
        portForward.stdout.on('data', data => {
          console.log(data.toString());
          if (data.toString().includes('Address already in use')) {
            throw new Error('Port 9229 already in use!')
          }
        })

      }
    })
  }

  return new Promise((resolve, reject) =>
    cp.on('exit', code =>
      code === 0
        ? resolve(messageBuffer.join('\n'))
        : reject(messageBuffer.join('\n')))
  );

}
