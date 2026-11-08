# npm Publishing & CI Guide

## Building All Packages

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

## Publishing Workflow

1. Ensure you are authenticated with npm (`npm whoami`).
2. Bump semantic versions across `@instaconnect/core`, `@instaconnect/react`, `@instaconnect/next`, and `instaconnect`.
3. Run the release verification and publish with `pnpm` (which automatically replaces `workspace:*` with exact semantic versions in published tarballs):

```bash
pnpm -r build
pnpm test
pnpm --filter "@instaconnect/*" publish --access public
pnpm --filter "instaconnect" publish --access public
```

