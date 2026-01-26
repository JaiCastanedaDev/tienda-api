const { spawnSync } = require('node:child_process');

function run(command, args, opts = {}) {
  const res = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  return res.status ?? 0;
}

function runPrismaGenerateWithWindowsWorkaround() {
  // 1) primer intento
  let code = run('npx', ['prisma', 'generate']);
  if (code === 0) return 0;

  // 2) workaround solo Windows: algunos procesos Node bloquean el query engine.
  if (process.platform === 'win32') {
    run('taskkill', ['/IM', 'node.exe', '/F']);
    code = run('npx', ['prisma', 'generate']);
    return code;
  }

  return code;
}

const genCode = runPrismaGenerateWithWindowsWorkaround();
if (genCode !== 0) {
  process.exit(genCode);
}

const migrateCode = run('npx', ['prisma', 'migrate', 'deploy']);
process.exit(migrateCode);
