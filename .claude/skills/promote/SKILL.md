---
name: promote
description: Put a tested commit from main live in production (the `promote` GitHub workflow), or roll production back to an earlier commit, then check prod is really running it. Use when asked to promote, release, deploy or update prod, or to roll prod back.
argument-hint: "[commit SHA – empty for the tip of main; an older SHA rolls back]"
allowed-tools: Bash(git *), Bash(gh *), Bash(curl *), Bash(aws lambda get-function-configuration *)
---

# /promote – put a commit live in production

Repository `jebbuilding/sitehq`. Production is https://sitehq.jevul.com, dev is https://sitehq-dev.jevul.com.
Region `eu-west-2`. The workflow is `.github/workflows/promote.yml`; `infra/README.md` › Promote and roll back
explains it. Speak plainly: James may be the one asking.

Argument: `$ARGUMENTS` – a commit SHA on `main`, or empty for the tip of `main`.

## 1. Work out what would go live

1. `git fetch -q origin`. The target is `$ARGUMENTS` if given (resolve it with `git rev-parse`), else `origin/main`.
2. The target must be on `main`: `git merge-base --is-ancestor <target> origin/main`. If not, stop and say so.
3. What is live now: `curl -s https://sitehq.jevul.com/version.json` → `commit`. Also note dev's, from
   https://sitehq-dev.jevul.com/version.json.
4. Is it forward or a rollback?
   - target == live: nothing to do – say so and stop.
   - live is an ancestor of target: **forward**. List `git log --oneline <live>..<target>`.
   - target is an ancestor of live: **rollback**. List `git log --oneline <target>..<live>` as what will be
     *undone*, and run `git diff --stat <target> <live> -- infra/` – any change there means infrastructure
     goes back too (resources added since may be removed). Data is not rolled back.
5. CI on main for the target must have passed:
   `gh run list --repo jebbuilding/sitehq --workflow ci.yml --branch main --commit <target> --json conclusion,status,url`.
   If none succeeded, stop: the workflow would refuse it anyway. Say what state it is in.

## 2. Ask before deploying – always

Production has no approval step in GitHub, so this is the only check. Show, in a few lines: live commit →
target commit, forward or rollback, the commit list, whether `infra/` changes, and dev's commit. Then ask
"Put this live in production?" and **wait for a clear yes in this conversation**. A yes given earlier, or for
another commit, does not count.

## 3. Run it

- `gh workflow run promote.yml --repo jebbuilding/sitehq --ref main -f commit=<full target SHA>`
  (always pass the SHA, even for the tip of main, so what you checked is what is deployed).
- Find the run: `gh run list --repo jebbuilding/sitehq --workflow promote.yml --limit 1 --json databaseId,displayTitle,status`
  and check its title names the target.
- Wait for it in the background (`run_in_background`), not by polling:
  `gh run watch <id> --repo jebbuilding/sitehq --interval 30`.
  `gh run watch` can exit non-zero on a dropped connection while the run is fine – **always** read the real
  result afterwards with `gh run view <id> --repo jebbuilding/sitehq --json status,conclusion,jobs`.

## 4. Check prod is really running it

1. `curl -s https://sitehq.jevul.com/version.json` – `commit` must be the target.
2. `aws lambda get-function-configuration --function-name sitehq-prod-http --region eu-west-2 --query 'Environment.Variables.[MAIL_FROM,APP_URL]' --output text`
   – both set (`no-reply@sitehq.jevul.com`, `https://sitehq.jevul.com/`). Skip with a note if AWS access fails.
3. `curl -s -o /dev/null -w "%{http_code}" https://sitehq.jevul.com/api/me` → `401` (API up, sign-in required).

## 5. Report

Live commit before → after, the run's link, and the three checks. If the run failed, quote the failing job's
name and the last lines of its log (`gh run view <id> --log-failed | tail -40`) and say what is live now –
a failed deploy can leave the previous version live. Never re-run or roll back without asking.
