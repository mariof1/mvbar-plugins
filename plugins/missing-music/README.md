# Missing Music

Missing Music is a removable first-party MVBar plugin. It compares local artists, albums, and tracks with MusicBrainz, then keeps the gaps in a server-side wanted list. An optional external provider can receive approved request metadata automatically.

The package is a declarative extension: this repository owns its versioned manifest, configuration contract, permissions, and distribution, while MVBar provides the constrained catalog/request implementation and native interface. Package releases do not require an MVBar repository commit; a feature that needs a new host capability still requires a compatible MVBar release.

The package does not receive media filesystem access or account credentials. On compatible MVBar hosts, an administrator can explicitly stage a matching Deezer song or album outside the music library, review it, and import it. MVBar's normal library scanner then discovers imported files.

## Quick start

1. Open **Admin → Plugins**.
2. Find **Missing Music** under **Official MVBar plugins** and select **Install with one click**.
3. Review the read-only catalog/request permissions and select **Review & enable**.
4. Open **Missing Music** from the main navigation.
5. Pick a local artist. Artists with MusicBrainz tags open immediately; for an untagged artist, choose the correct MusicBrainz match. MVBar remembers that choice.

No files, command-line steps, API keys, or external services are required for this wanted-list mode. Users can request missing albums or individual tracks. Administrators can approve, reject, retry, delete, or manually mark requests fulfilled.

By default, the comparison includes albums and EPs while hiding common live, compilation, remix, DJ-mix, interview, and spoken variants. Both lists are editable in the plugin configuration.

## Request a song from search

With the plugin installed and enabled, open MVBar's normal search and enter at least three characters of a song title, optionally including the artist. The **Missing songs** section checks MusicBrainz while local search results remain available.

- **In library** means a matching recording ID or title/performer was found in a library you can access.
- **Request song** adds the song to the Missing Music request queue and sends connected administrators a realtime alert containing its artist and title.
- **Requested** means you already have an active request for that recording. Repeated requests, including simultaneous submissions, are prevented.

Song search prefers main album recordings, falling back to EPs and then singles for the same song and artist. Live, remix, demo, acoustic, karaoke, edited, surround, and other alternate recordings are excluded, as are compilations and other secondary release types. Results are deduplicated by song and artist. Recordings without an identifiable album, EP, or single are omitted from search. This filtering requires an updated MVBar host; the package alone cannot change an older host. The request API still accepts standalone recordings. Administrators review song requests in the same queue as album requests; no download is started directly by search.

## Browse an artist's missing albums

Open **Missing Music** and search for a local or MusicBrainz artist. Choose an artist to compare the main albums and EPs against your library. An album already in the library can still be opened to find missing tracks; an incomplete album can be requested. Artist and album selections stay in the URL, so a link can be shared or reopened. Users can submit requests, while administrators can filter and search the queue, approve or reject requests, and remove obsolete ones.

## Administrator Deezer staging

On a compatible MVBar host, leave **Request provider URL** blank and configure `DEEZER_ARL`, `DEEZER_PYTHON`, and `DEEZER_DOWNLOAD_DIR` on the server. Install the Python packages in `api/requirements-deezer.txt` into the environment selected by `DEEZER_PYTHON`. `DEEZER_QUALITY` selects MP3 128 (`0`, default), MP3 320 (`1`), or FLAC (`2`), subject to account availability. Keep the staging directory private, writable by MVBar, and separate from the music library. Never put the account cookie in the plugin settings or browser.

In the admin request queue, select **Find on Deezer**, check the exact artist, title, and album, then select **Stage song** or **Stage album**. Album staging checks the full track list, reports progress, and creates a ZIP only after every track succeeds. Download the staged song or ZIP, review and import it into your music library, then mark the request fulfilled. Staging does not start when a user searches or requests music. It is unavailable while an external request provider is configured. Use downloaded recordings only where you have the rights to retain them.

### Host compatibility

Package **1.4.0** documents artist album browsing, incomplete-album requests, queue improvements, and administrator Deezer staging supplied by MVBar commit [`b96b5a9`](https://github.com/mariof1/mvbar/commit/b96b5a9) on `dev`. Use a host build containing that commit or a later release that includes it. Updating this package on an older host does not add those host features; existing album/catalog features remain available. An older enabled package also gains new host features when MVBar is updated.

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
    "artistId": "artist MBID",
    "releaseGroupId": "release-group MBID",
    "releaseId": "release MBID or null",
    "recordingId": "recording MBID or null"
  }
}
```

For song requests, `itemType` is `track`, `recordingId` is required, and `album`, `releaseGroupId`, and `releaseId` can be null. Providers must accept standalone recordings without requiring an album.

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

Disabling the plugin hides the feature and stops provider handoffs. Removing it deletes its request records, saved artist matches, and MusicBrainz cache through the normal plugin cascade. It never removes library media.

Plugin state is held in the MVBar database. The installed `.ndp` package is held in the persistent plugin directory:

- Docker: `/data/plugins`
- Linux standalone: `~/.local/share/mvbar/data/plugins`
- Windows standalone: `%LOCALAPPDATA%\MVBar\data\plugins`

## Troubleshooting

- **Song search is missing:** check that the plugin is installed and enabled, enter at least three characters, and update the MVBar host to a build with the song-search integration described above.
- **An artist asks for a match:** its local files do not contain a MusicBrainz artist ID. Choose the closest MusicBrainz result; use **Change match** later if needed.
- **Too many unusual releases:** adjust **Release types** or **Exclude release variants** in Admin → Plugins.
- **A request stays “On wanted list”:** this is expected without a provider. Handle it manually and select **Mark fulfilled**.
- **Deezer staging is unavailable:** use a compatible MVBar host, leave the external request provider unset, install the Python requirements, and configure the server-side ARL, Python executable, and writable staging directory.
- **An album is already in the library:** open it in Missing Music to inspect its tracks. You can request it if one or more tracks are missing.
- **The navigation item is missing:** ensure the package is installed, globally enabled by `PLUGINS_ENABLED=true`, and enabled on its Admin → Plugins card.
- **MusicBrainz is temporarily unavailable:** wait briefly and retry. MVBar rate-limits calls and caches successful catalog responses for 24 hours.
