#!/usr/bin/env node

import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { program } from 'commander';
import { git, gitLines, symbols, header, fatal, isInsideGitRepo, getCurrentBranch, getDefaultBranch } from './utils.js';

program
  .name('git-nuke')
  .description('Delete a branch everywhere — local, remote, and tracking refs')
  .argument('[branch]', 'branch to nuke')
  .option('-m, --merged', 'find and nuke all fully merged branches')
  .option('-f, --force', 'skip confirmation prompt')
  .version('1.0.0')
  .addHelpText('after', `
Examples:
  git nuke feature-old          Delete feature-old locally and remotely
  git nuke --merged             Nuke all merged branches
  git nuke -f stale-branch      Nuke without asking`)
  .action(run);

program.parse();

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

function getBranchInfo(branch) {
  const current = getCurrentBranch();
  const isLocal = gitLines(['branch', '--list', branch]).length > 0;
  let remotes = [];
  try {
    const remoteBranches = gitLines(['branch', '-r', '--list', `*/${branch}`]);
    remotes = remoteBranches.map((r) => r.trim()).filter((r) => r.endsWith('/' + branch));
  } catch {}
  return { isLocal, remotes, isCurrent: branch === current };
}

function getMergedBranches() {
  const defaultBranch = getDefaultBranch();
  const current = getCurrentBranch();
  const protected_ = new Set([defaultBranch, current, 'HEAD'].filter(Boolean));
  const merged = gitLines(['branch', '--merged', defaultBranch])
    .map((b) => b.trim().replace(/^\* /, ''))
    .filter((b) => !protected_.has(b) && b.length > 0);
  return merged;
}

async function nukeBranch(branch, { skipConfirm = false, forceDelete = false } = {}) {
  const info = getBranchInfo(branch);
  if (info.isCurrent) {
    fatal(`Cannot nuke the current branch (${branch}). Switch to another branch first.`);
  }
  if (!info.isLocal && info.remotes.length === 0) {
    fatal(`Branch '${branch}' not found locally or on any remote`);
  }

  console.log(chalk.bold('  Plan:'));
  if (info.isLocal) {
    console.log(`    ${chalk.red(symbols.cross)} Delete local branch ${chalk.white(branch)}`);
  }
  for (const remote of info.remotes) {
    console.log(`    ${chalk.red(symbols.cross)} Delete remote branch ${chalk.white(remote)}`);
  }
  console.log(`    ${chalk.yellow(symbols.bullet)} Prune tracking refs`);
  console.log();

  if (!skipConfirm) {
    const ok = await confirm(`  ${chalk.yellow('?')} Proceed? (y/N) `);
    if (!ok) {
      console.log(chalk.dim('  Aborted.'));
      console.log();
      return false;
    }
  }

  if (info.isLocal) {
    try {
      git(['branch', forceDelete ? '-D' : '-d', branch]);
      console.log(`  ${chalk.green(symbols.check)} Deleted local branch ${chalk.white(branch)}`);
    } catch (e) {
      console.log(`  ${chalk.red(symbols.cross)} Failed to delete local branch: ${e.message}`);
    }
  }

  for (const remote of info.remotes) {
    const [remoteName, ...branchParts] = remote.split('/');
    const remoteBranch = branchParts.join('/');
    try {
      git(['push', remoteName, '--delete', remoteBranch]);
      console.log(`  ${chalk.green(symbols.check)} Deleted remote branch ${chalk.white(remote)}`);
    } catch (e) {
      console.log(`  ${chalk.red(symbols.cross)} Failed to delete ${remote}: ${e.stderr || e.message}`);
    }
  }

  const prunedRemotes = new Set();
  for (const remote of info.remotes) {
    const remoteName = remote.split('/')[0];
    if (!prunedRemotes.has(remoteName)) {
      git(['remote', 'prune', remoteName], { allowFail: true });
      prunedRemotes.add(remoteName);
    }
  }
  if (prunedRemotes.size === 0) {
    git(['remote', 'prune', 'origin'], { allowFail: true });
  }
  console.log(`  ${chalk.green(symbols.check)} Pruned tracking refs`);
  return true;
}

async function run(branch, opts) {
  if (!isInsideGitRepo()) fatal('Not inside a git repository');

  if (opts.merged) {
    header('git nuke --merged');
    const merged = getMergedBranches();
    if (merged.length === 0) {
      console.log(chalk.dim('  No merged branches to clean up.'));
      console.log();
      return;
    }

    console.log(chalk.bold(`  Found ${merged.length} merged branch${merged.length === 1 ? '' : 'es'}:\n`));
    for (const b of merged) {
      console.log(`    ${chalk.red(symbols.cross)} ${b}`);
    }
    console.log();

    if (!opts.force) {
      const ok = await confirm(`  ${chalk.yellow('?')} Nuke all ${merged.length} branches? (y/N) `);
      if (!ok) {
        console.log(chalk.dim('  Aborted.'));
        console.log();
        return;
      }
    }

    console.log();
    for (const b of merged) {
      await nukeBranch(b, { skipConfirm: true });
    }
    console.log();
    console.log(`  ${chalk.green(symbols.check)} Done. ${merged.length} branch${merged.length === 1 ? '' : 'es'} nuked.`);
    console.log();
  } else {
    if (!branch) {
      fatal('Specify a branch name or use --merged');
    }
    header(`git nuke ${chalk.white(branch)}`);
    await nukeBranch(branch, { skipConfirm: opts.force, forceDelete: opts.force });
    console.log();
  }
}
