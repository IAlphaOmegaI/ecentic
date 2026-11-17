# esign

Ecentic's document signing service runs at [esign.ecentic.ai](https://esign.ecentic.ai). Its source is maintained separately in the private [IAlphaOmegaI/esign](https://github.com/IAlphaOmegaI/esign) repository, based on [SignuDoc](https://github.com/NYLLON-SOFTWARE/signudoc).

The [`apps/esign`](../../apps/esign/README.md) directory contains a link to that repository. It has no package manifest or submodule checkout, so this monorepo's Bun and Turborepo commands do not install or build the signing app.

## Development

Developers with access to the private repository should clone it into a separate checkout, outside this monorepo's `apps/*` workspace:

```sh
git clone https://github.com/IAlphaOmegaI/esign.git ../esign
cd ../esign
npm ci
```

Use Node.js 24 and follow the signing repository's README and environment setup instructions. It owns its npm lockfile and database migrations. Commit and push signing changes in that repository.

## Deployment

The `ecentic-esign` Vercel project deploys the signing repository's `main` branch to [esign.ecentic.ai](https://esign.ecentic.ai). It has its own database, private document storage, email configuration, and production secrets. Changes to this monorepo do not deploy esign.

Upstream SignuDoc updates should be reviewed and merged in the signing repository. Keeping the repositories separate allows its release schedule and dependencies to remain independent of the commerce application.
