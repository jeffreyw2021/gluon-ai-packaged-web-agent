#!/usr/bin/env node
/**
 * NOTE: npm 7+ (RFC 0018) no longer runs lifecycle scripts of packages being
 * removed. This file will NOT execute when `npm uninstall gluon-ai` is called.
 *
 * Use the project-level script injected by `npx gluon-ai init` instead:
 *
 *   npm run gluon:uninstall
 *
 * That script calls `npx gluon-ai uninstall`, which prompts you and handles
 * all cleanup before removing the package.
 */
"use strict";

// If this script is somehow invoked directly it prints helpful guidance.
console.log(`
[gluon-ai] ──────────────────────────────────────────────────────
  npm 7+ does not run a package's lifecycle scripts on uninstall.

  To cleanly remove gluon-ai and all the files it scaffolded, run:

    npm run gluon:uninstall

  That alias was added to your package.json by \`npx gluon-ai init\`.
  It calls the CLI uninstall command which prompts before deleting.

  Alternatively:  npx gluon-ai uninstall
──────────────────────────────────────────────────────────────────
`);
