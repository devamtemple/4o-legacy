#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Test wrapper script that handles deprecated Jest options.
 * Jest 30 replaced --testPathPattern with --testPathPatterns.
 * This script transforms the old option to the new one.
 */

const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

// Transform --testPathPattern= to --testPathPatterns=
const transformedArgs = args.map(arg => {
  if (arg.startsWith('--testPathPattern=')) {
    return arg.replace('--testPathPattern=', '--testPathPatterns=');
  }
  return arg;
});

const result = spawnSync('npx', ['jest', ...transformedArgs], {
  stdio: 'inherit',
  cwd: process.cwd()
});

process.exit(result.status || 0);
