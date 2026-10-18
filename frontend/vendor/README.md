# Vendored packages

`policyengine-household-wizard-0.2.0-givecalc.<commit>.tgz` is a build of
[policyengine-household-wizard](https://github.com/PolicyEngine/policyengine-household-wizard)
at that commit (`bun run build && npm pack`), with its version set to
`0.2.0-givecalc.<commit>` so it cannot be mistaken for npm's 0.1.0. GiveCalc needs the inputs added in
PolicyEngine/policyengine-household-wizard#9, and npm still serves 0.1.0 because
the package's releases fail to publish until a trusted publisher is set up on
npmjs.com.

Once a release with those inputs is on npm, replace the tarball with it:

From `frontend/`:

```bash
bun remove policyengine-household-wizard
bun add policyengine-household-wizard@^0.2.0
rm vendor/policyengine-household-wizard-*.tgz
```
