# MVBar plugins

This is the public registry and source repository for official [MVBar](https://github.com/mariof1/mvbar) plugins.

MVBar reads [`registry.json`](./registry.json) to discover updates. An administrator can install or update an official plugin from the MVBar plugin interface; no server-side file copying is required. Published packages remain permission-scoped, disabled until their first approval, and validated by MVBar before installation.

## Available plugins

| Plugin | Purpose | Documentation |
| --- | --- | --- |
| Missing Music | Compare a local library with MusicBrainz and maintain a wanted list. | [Setup and provider contract](./plugins/missing-music/README.md) |

## Releasing an update

1. Change the plugin under `plugins/<key>` and bump its manifest version.
2. Run `npm install` once, then `npm run build`.
3. Commit the source, `dist` package, and regenerated `registry.json` together.
4. Push `main`. MVBar servers will see the new registry entry without an MVBar application release.

`npm test` rebuilds every package and verifies that the committed registry and artifacts are current. CI runs the same check for every push and pull request.

Optional GitHub releases can be created by pushing a tag. The release workflow attaches the current registry and all `.ndp` packages.

## Repository layout

```text
plugins/<key>/manifest.json        plugin manifest
plugins/<key>/registry-entry.json registry key and output filename
plugins/<key>/README.md            user documentation
dist/*.ndp                         installable packages
registry.json                      machine-readable update catalog
scripts/build.mjs                  deterministic package/registry builder
```

The registry is deliberately small and static. MVBar still parses every downloaded `.ndp`, verifies its checksum and identity, and shows its requested permissions before enabling it.
