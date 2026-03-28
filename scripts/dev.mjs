import { spawn } from 'node:child_process';

const commands = [
  {
    name: 'demo-server',
    cmd: 'npm',
    args: ['run', 'dev:server', '--workspace', 'apps/demo']
  },
  {
    name: 'demo-client',
    cmd: 'npm',
    args: ['run', 'dev:client', '--workspace', 'apps/demo']
  }
];

const children = commands.map(({ name, cmd, args }) => {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
