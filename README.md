# git-nuke-cli

> The "I am done with this branch" nuclear option. Deletes local + remote + tracking refs in one command.

## Install

```sh
npm install -g git-nuke-cli
```

## Usage

```sh
# Nuke a specific branch
git nuke feature-old

# Nuke without confirmation
git nuke -f stale-branch

# Find and nuke ALL merged branches
git nuke --merged
```

### Example output

```
git nuke feature-old ──────────────────────────────

  Plan:
    ✗ Delete local branch feature-old
    ✗ Delete remote branch origin/feature-old
    ● Prune tracking refs

  ? Proceed? (y/N) y

  ✓ Deleted local branch feature-old
  ✓ Deleted remote branch origin/feature-old
  ✓ Pruned tracking refs
```

### Merged branches cleanup

```
git nuke --merged ─────────────────────────────────

  Found 3 merged branches:

    ✗ feature/login
    ✗ fix/typo
    ✗ chore/deps

  ? Nuke all 3 branches? (y/N) y

  ✓ Deleted local branch feature/login
  ✓ Deleted local branch fix/typo
  ✓ Deleted local branch chore/deps
  ✓ Done. 3 branches nuked.
```

## Features

- **Shows the plan first**: See exactly what will be deleted before confirming
- **Deletes everywhere**: Local branch, remote branch, and prunes tracking refs
- **Merged cleanup**: `--merged` finds all branches already merged into the default branch
- **Safety first**: Refuses to nuke the current branch, asks for confirmation by default
- **Force mode**: `-f` skips confirmation for scripting

## License

MIT
