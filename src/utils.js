import { execFileSync } from 'node:child_process';
import chalk from 'chalk';

export function git(args, opts = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.allowFail) return '';
    throw e;
  }
}

export function gitLines(args, opts = {}) {
  const out = git(args, opts);
  return out ? out.split('\n') : [];
}

export function getCurrentBranch() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  // In detached HEAD state, git returns the literal string "HEAD"
  return branch === 'HEAD' ? null : branch;
}

export function getDefaultBranch() {
  try {
    const ref = git(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    return ref.replace('refs/remotes/origin/', '');
  } catch {
    for (const name of ['main', 'master']) {
      try {
        git(['rev-parse', '--verify', name]);
        return name;
      } catch {}
    }
    return 'main';
  }
}

export function isInsideGitRepo() {
  try {
    git(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

export const symbols = {
  bullet: '●',
  check: '✓',
  cross: '✗',
  warning: '⚠',
  line: '─',
};

export function header(text) {
  // Strip ANSI escape codes so chalk-colored text doesn't skew the padding
  const plainLength = text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '').length;
  const line = symbols.line.repeat(Math.max(0, 50 - plainLength));
  console.log(`\n${chalk.bold.cyan(text)} ${chalk.dim(line)}\n`);
}

export function fatal(msg) {
  console.error(`${chalk.red(symbols.cross)} ${msg}`);
  process.exit(1);
}
