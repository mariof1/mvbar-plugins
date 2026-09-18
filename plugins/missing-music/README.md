# Missing Music

Missing Music is a removable first-party MVBar plugin. Deezer is the primary catalog for artist, album, and song discovery. MVBar compares that catalog with the local library, detects missing albums and tracks, and keeps the gaps in a server-side wanted list. An optional external provider can receive approved request metadata automatically.

The package is a declarative extension: this repository owns its versioned manifest, configuration contract, permissions, and distribution, while MVBar provides the constrained catalog/request implementation and native interface. Package releases do not require an MVBar repository commit; a feature that needs a new host capability still requires a compatible MVBar release.

The package does not receive media filesystem access or account credentials. On compatible MVBar hosts, an administrator can explicitly stage a matching Deezer song or album outside the music library, review it, and import it. MVBar's normal library scanner then discovers imported files.

## Quick start

1. Open **Admin → Plugins**.
2. Find **Missing Music** under **Official MVBar plugins** and select **Install with one click**.
3. Review the read-only catalog/request permissions and select **Review & enable**.
4. Open **Missing Music** from the main navigation.
5. Pick a local artist and choose the correct Deezer artist match. MVBar remembers the Deezer artist ID for that user so future catalog checks open directly.

No files, command-line steps, API keys, or external services are required for this wanted-list mode. Users can request missing albums or individual tracks. Administrators can approve, reject, retry, delete, or manually mark requests fulfilled.

If **Require administrator approval** is disabled, compatible MVBar hosts also expose **Auto-download from Deezer**. When enabled, a new Deezer-backed request is approved immediately and the exact Deezer album or track ID already selected by the catalog is staged automatically. Legacy requests without a stored Deezer ID still use the stricter fallback search. This mode requires Deezer staging to be configured on the MVBar server and cannot be combined with an external request provider.


By default, the Deezer comparison includes albums and EPs while hiding common live, compilation, remix, and soundtrack variants. **Prefer special editions** can choose Deluxe/Expanded/Extended editions when Deezer lists several versions with the same base title. Release types and excluded variants are editable in the plugin configuration.

## Request a song from search

With the plugin installed and enabled, open MVBar's normal search and enter at least three characters of a song title, optionally including the artist. The **Missing songs** section searches Deezer while local search results remain available.

- **In library** means MVBar found the Deezer song locally. ISRC is used when both sides have one; otherwise MVBar falls back to artist/title matching with track number, disc, and duration as supporting evidence.
- **Request song** adds the exact Deezer track ID to the Missing Music request queue and sends connected administrators a realtime alert containing its artist and title.
- **Requested** means you already have an active request for that Deezer track. Repeated requests, including simultaneous submissions, are prevented.

Deezer song results carry the Deezer artist, album, and track IDs into the request, so staging does not need to search for the item a second time. Local files do not need ISRC or MusicBrainz tags: within a matched album, normalized title is the minimum signal, with track number, disc number, and duration increasing confidence. Administrators review song requests in the same queue as album requests unless automatic Deezer staging is enabled.

## Browse an artist's missing albums

Open **Missing Music** and search for a local or Deezer artist. Choose the correct Deezer artist once, then compare its main albums and EPs with your local library. Album titles are normalized so common Deluxe/Remaster/Expanded suffixes can still match the local album, while genuinely different releases such as Live albums remain separate. Partial albums stay in the **Missing** view. Expanding one compares every Deezer track with local files and shows which songs are present or missing, including match confidence. Users can request the full album or only individual missing tracks.

## Import a Deezer playlist

Open **Missing Music → Deezer Playlists** to browse featured Deezer playlists or search by name, for example **Vitamin D**. Results appear as compact artwork cards showing the playlist name, creator, and track count.

Selecting **Import playlist** creates a normal MVBar playlist for the current user with the same name and Deezer artwork. MVBar reuses matching tracks that are already in an accessible local library and stages only the missing tracks. Downloaded tracks still live in the normal Missing Music staging layout under their own **Artist/Album/** folders; no playlist-specific media folder is created.

The import runs as a durable background job and resumes after server restarts. The Missing Music page shows live **added/total** progress, while the normal **Playlists** page displays the Deezer artwork and fills in tracks as they are discovered by the library scanner. Repeated tracks in the source Deezer playlist are deduplicated because MVBar playlists store each track once. Imports currently support up to 1,000 Deezer tracks.

Administrators can explicitly start a playlist import whenever Deezer staging is configured and no external request provider is active. For ordinary users, **Require administrator approval** must be disabled and **Auto-download from Deezer** enabled so a single playlist import cannot create hundreds of approval prompts. The generated per-track batch requests stay hidden from the normal Missing Music request queue.

## Administrator Deezer staging

On a compatible MVBar host, leave **Request provider URL** blank. For Docker Compose, add `DEEZER_ARL` to the private `.env` file and run `docker compose up -d --build`. The image includes Python, streamrip, and the download helper; Compose uses a persistent `deezer_staging` volume. There is no need to install Python inside the running container or set `DEEZER_PYTHON`. For a standalone host, install `api/requirements-deezer.txt` into a Python environment and set `DEEZER_ARL`, `DEEZER_PYTHON`, and `DEEZER_DOWNLOAD_DIR` on the server. `DEEZER_QUALITY` selects MP3 128 (`0`, default), MP3 320 (`1`), or FLAC (`2`), subject to account availability. Keep the staging directory private, writable by MVBar, and separate from the music library. Never put the account cookie in the plugin settings or browser.

New Deezer-backed requests already contain the exact Deezer IDs selected in the catalog. Administrators can stage them manually, or enable **Auto-download from Deezer** when approval is disabled. Album staging checks the full track list and publishes only the extracted artist/album folder into the staging library; no permanent album ZIP is stored. If an administrator selects **Download album ZIP**, MVBar creates and streams the archive on demand from the current staged files. Staging is unavailable while an external request provider is configured. Use downloaded recordings only where you have the rights to retain them.

### Host compatibility

Package **1.7.0** adds Deezer playlist discovery/import, compact artwork cards, persistent import progress, reuse of existing local tracks, automatic staging of missing tracks into their normal Artist/Album folders, and creation of a same-name MVBar playlist with Deezer artwork. These host features require MVBar `dev` commit `7483d6c63eb7784d25981e459c451e8d993221fd` or a later build containing the playlist-import commits. Package **1.6.0** introduced the Deezer-first artist/album/song catalog and partial-album matching. Updating only the plugin package on an older MVBar host does not add the new playlist endpoints.

Install or update this package through **Admin → Plugins → Official MVBar plugins**. MVBar downloads it from this central repository; no manual package copying is needed.

## Optional automatic provider

Set **Request provider URL** only when you already have a compatible service that should receive approved requests. Add its bearer token if required. Enable **Allow a private-network provider** for a trusted HTTP(S) service on your LAN, such as `http://192.168.1.20:8080`.

Leave the provider URL blank to keep using the built-in wanted list. Approved requests remain available for manual handling and can be marked fulfilled by an administrator.

## Request-provider contract

MVBar sends `POST <base-url>/v1/requests` with an optional bearer token and this JSON shape:

```json
{
  "requestId": "MVBar request UUID",
  "itemType": "album",
  "artist": "Artist name",
  "title": "Release or track title",
  "album": "Album title",
  "musicBrainz": {
    "artistId": "legacy artist MBID or null",
    "releaseGroupId": "legacy release-group MBID or null",
    "releaseId": "legacy release MBID or null",
    "recordingId": "legacy recording MBID or null"
  },
  "deezer": {
    "artistId": "Deezer artist ID",
    "albumId": "Deezer album ID",
    "trackId": "Deezer track ID or null",
    "isrc": "ISRC when available, otherwise null"
  }
}
```

For new Deezer-backed song requests, `itemType` is `track` and the `deezer` block identifies the exact artist, album, and track. The `musicBrainz` fields can all be null. Legacy requests may still contain MusicBrainz identifiers, so providers should continue accepting both forms.

The service returns:

```json
{
  "providerRequestId": "provider-owned stable ID",
  "status": "queued"
}
```

MVBar polls `GET <base-url>/v1/requests/<providerRequestId>`. Accepted status values are:

- queued: `queued`, `processing`, `submitted`
- complete: `ready`, `complete`, `completed`, `fulfilled`
- failed: `failed`, `error`, `rejected`

A failure response can include an `error` string. No media URL or file is accepted by this contract.

Public providers must use HTTPS. Private or loopback providers require the administrator to enable the explicit private-network option. Redirects are rejected, and the token is sent only to the configured origin.

## Lifecycle and updates

MVBar discovers official releases from the public [`mvbar-plugins`](https://github.com/mariof1/mvbar-plugins) registry. Updates can therefore be published without rebuilding MVBar itself. Every downloaded package is checksum-verified and parsed by MVBar before installation.

Disabling the plugin hides the feature and stops provider handoffs. Removing it deletes its request records, saved Deezer artist matches, and legacy MusicBrainz cache through the normal plugin cascade. It never removes library media.

Plugin state is held in the MVBar database. The installed `.ndp` package is held in the persistent plugin directory:

- Docker: `/data/plugins`
- Linux standalone: `~/.local/share/mvbar/data/plugins`
- Windows standalone: `%LOCALAPPDATA%\MVBar\data\plugins`

## Troubleshooting

- **Song search is missing:** check that the plugin is installed and enabled, enter at least three characters, and update the MVBar host to a build with the song-search integration described above.
- **An artist asks for a match:** choose the correct Deezer artist for the local artist name. Use **Change match** later if the wrong artist was selected.
- **Too many unusual releases:** adjust **Release types** or **Exclude release variants** in Admin → Plugins.
- **A request stays “On wanted list”:** this is expected without a provider. Handle it manually and select **Mark fulfilled**.
- **Deezer staging is unavailable:** use a compatible MVBar host, leave the external request provider unset, install the Python requirements, and configure the server-side ARL, Python executable, and writable staging directory.
- **An album is already in the library:** open it in Missing Music to inspect its tracks. You can request it if one or more tracks are missing.
- **A Deezer playlist will not import:** make sure no external request provider is configured and Deezer staging is available. Non-administrator users also need **Require administrator approval** off and **Auto-download from Deezer** on.
- **An imported playlist has fewer tracks than Deezer:** duplicate Deezer track IDs are intentionally collapsed because an MVBar playlist can contain a given track only once. Failed downloads are shown as a partial import.
- **The navigation item is missing:** ensure the package is installed, globally enabled by `PLUGINS_ENABLED=true`, and enabled on its Admin → Plugins card.
- **Deezer catalog lookup fails:** retry after a short delay and confirm the MVBar host can reach `api.deezer.com`. Deezer catalog discovery does not require the ARL; the ARL is only required for staging/downloads.
