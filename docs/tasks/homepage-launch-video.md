# Homepage launch film

Updated 5 October 2026. The main homepage film is the approved 59-second launch
cut, with its original 60fps motion and Artlist soundtrack. `HeroVideo` is shared
by the English and Spanish homepages.

| Asset in `apps/web/public/videos/` | Encoding | Bytes |
| --- | --- | ---: |
| `ecentic-launch-20261005.mp4` | 1920×1080, H.264 High 4.2, 60fps, AAC stereo 128kbps, 59s | 12,788,439 |
| `ecentic-launch-preview-20261005.mp4` | 960×540, H.264, 30fps, 14s, no audio | 400,552 |
| `ecentic-launch-poster-20261005.webp` | 1600×900 WebP | 82,040 |

The full file is 66.9% smaller than the 38,623,964-byte delivery
master. Automatic preview video bytes are 95.6% lower than the
previous 9,046,291-byte asset. The old banner and loop were identical 70-second
files with audio; the preview now has its own short, silent encode.

## Loading behavior

The server renders the poster without a video source. After hydration, the small
preview loads only within 160px of the viewport, while the page is visible and
the dialog is closed. Reduced motion or a browser Save-Data preference keeps the
poster instead. Leaving those conditions pauses playback, removes the source
and cancels media loading. The preview fades back to the canvas at its end.

The full film mounts only when the visitor opens the existing accessible Dialog.
It has native controls, inline playback and `preload="none"`; the explicit click
starts playback unless reduced motion is enabled, in which case native Play is
available. Closing the dialog immediately unmounts the film and stops its audio.
The existing dialog returns focus to its trigger. No player dependency was added.

All information is visual; the soundtrack contains decorative music and effects,
with no speech. The scoped caption-lint exception records that fact.

## Caching and encoding

`next.config.ts` already gives `/videos/*` a one-year immutable cache lifetime.
Always give a replacement a new filename and update all three component paths.
The old filenames remain available for cached pages; the current component no
longer references them. Both new MP4s have their `moov` index before media data
(`+faststart`) and the server supports byte-range seeking.

The approved master has SHA-256:
`7cac88aab8a56959454623646ad9b03b2274a4664621b96ce9045c239129a7d2`.
Reproduce these assets from that master, from the repository root:

```sh
launch_master=/path/to/approved-master.mp4
ffmpeg -i "$launch_master" -map 0:v:0 -map 0:a:0 \
  -c:v libx264 -preset slow -crf 23 -profile:v high -level:v 4.2 \
  -pix_fmt yuv420p -g 120 -maxrate 6M -bufsize 12M \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart -map_metadata -1 \
  apps/web/public/videos/ecentic-launch-20261005.mp4
ffmpeg -i "$launch_master" -t 14 -an \
  -vf 'fps=30,scale=960:-2:flags=lanczos,fade=t=out:st=13.6:d=0.4:color=0xf5f5f5' \
  -c:v libx264 -preset slow -crf 28 -profile:v high -level:v 3.1 \
  -pix_fmt yuv420p -g 60 -maxrate 700k -bufsize 1400k \
  -movflags +faststart -map_metadata -1 \
  apps/web/public/videos/ecentic-launch-preview-20261005.mp4
ffmpeg -ss 1.4 -i "$launch_master" -frames:v 1 \
  -vf 'scale=1600:-2:flags=lanczos' -c:v libwebp -quality 82 \
  apps/web/public/videos/ecentic-launch-poster-20261005.webp
```

## Verification

- Both MP4s decode completely; the full film retains 3,540 frames and the preview
  has 420 frames with no audio stream. The full container is 59.050s (AAC padding).
- Master/encode comparisons of ChatGPT cards, écentic and Shopify charts, the
  closing CTA, preview and poster show no material compression or clipping issue.
- Browser checks cover mobile and desktop playback, seeking to the ending,
  English/Spanish dialog labels, close cleanup, and focus return. DOM checks show
  the preview source is removed while the full film is mounted and restored on
  close, with no full-film element while closed.
- HTTP checks return `video/mp4`, immutable caching, and `206 Partial Content`
  for a 1,024-byte range. Both files pass the faststart atom-order check.
- Scoped Biome passes. Under the same generated types, TypeScript reports the
  same 298 baseline errors before and after this change, with no new diagnostics.
- `bun run build:web` passes: all seven tasks successful. The final source
  review found no loading-lifecycle or media-versioning blockers.
