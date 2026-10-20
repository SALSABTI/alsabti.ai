---
name: vercel-deploy-check
description: Check that the Autra Oud app built and deployed correctly on Vercel and diagnose failures. Use after pushing changes, when the user says the site is broken, a deployment failed, a page shows an error, or asks "is it live?".
---

# Checking the Vercel deployment

The app is the Vercel project `business-manager` (project id `prj_gARty49NyApCb4179xxuZ2ZuNd4W`,
team `team_76LANChV0ulumcMppNG85Ny5`, scope "saidai1"). Reuse these ids; don't guess others.

## Steps

1. **Find the deployment.** List the latest deployments for the project (filter by branch when
   checking a pushed branch, or `target: production` for the live site). Note state, URL, commit.
2. **If state is ERROR / CANCELED:** read the build logs and find the first real error (not the
   last line). Typical causes: type errors, a missing dependency, an env var that exists locally
   but not in Vercel, wrong build command or output directory. Reproduce locally with the same
   command (`npm ci && npm run build`) before fixing.
3. **If READY but the site misbehaves:** check runtime errors first, then runtime logs for the
   time window the user mentions. Open the deployment URL in Chromium and check the browser
   console.
4. **Fix, verify locally, push**, then confirm the new deployment reaches READY.

## Access problems

A 403 "Trying to access resource under scope 'saidai1'" means the Vercel connector is not
authorised for that team. Don't retry the same call; tell the user to reconnect the Vercel
connector in Claude's settings with the "saidai1" team allowed. Never ask for or print tokens,
and never print the values of environment variables.

## Reporting

Report plainly: live or not, the URL, what was wrong (observed vs. suspected), and what you
changed. Separate "deployment is still building" from "deployment succeeded".
