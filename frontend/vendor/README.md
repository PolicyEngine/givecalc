# Vendored packages

`policyengine-household-wizard-0.3.0-givecalc.childcare.0678121.tgz` is a build of
[policyengine-household-wizard](https://github.com/PolicyEngine/policyengine-household-wizard)
at commit `0678121580428d60ca49de23ea13613420fc8d56`
([PR #14](https://github.com/PolicyEngine/policyengine-household-wizard/pull/14)).
It adds household childcare expenses to the draft and SPM-unit mapping. npm's
0.3.0 release does not contain that input.

To reproduce, run `bun install --frozen-lockfile && bun run build` at that
commit, copy `dist/`, `src/`, `package.json`, `LICENSE` and `README.md` into a
staging directory, set the staging package's version to
`0.3.0-givecalc.childcare.0678121`, and run `bun pm pack --ignore-scripts` there.
The custom version distinguishes this source snapshot from the npm release.

Once a release with those inputs is on npm, replace the tarball with it:

From `frontend/`:

```bash
bun remove policyengine-household-wizard
bun add policyengine-household-wizard@<released-version-with-childcare>
rm vendor/policyengine-household-wizard-*.tgz
```
