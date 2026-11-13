# Homepage launch film

Updated 8 October 2026. The main homepage film is the approved 58-second launch
cut with the overlapping storefront-to-card transformation, with its original 60fps motion and Artlist soundtrack. `HeroVideo` is shared
by the English and Spanish homepages.

| Asset in `apps/web/public/videos/` | Encoding | Bytes |
| --- | --- | ---: |
| `ecentic-launch-20261008.mp4` | 1920×1080, H.264 High 4.2, 60fps, AAC stereo 128kbps, 58s | 12,197,943 |
| `ecentic-launch-preview-20261008.mp4` | 960×540, H.264, 30fps, 14s, no audio | 498,651 |
| `ecentic-launch-poster-20261008.webp` | 1600×900 WebP | 81,230 |

The full file is 69.0% smaller than the 39,381,470-byte delivery
master. Automatic preview video bytes are 94.5% lower than the
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
`59ee2246f7fd2ac984a1096d7c2e184518c15ca9261892c85a55fbc38f55886e`.
Reproduce these assets from that master, from the repository root:

```sh
launch_master=/path/to/approved-master.mp4
ffmpeg -i "$launch_master" -map 0:v:0 -map 0:a:0 \
  -c:v libx264 -preset slow -crf 23 -profile:v high -level:v 4.2 \
  -pix_fmt yuv420p -g 120 -maxrate 6M -bufsize 12M \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart -map_metadata -1 \
  apps/web/public/videos/ecentic-launch-20261008.mp4
ffmpeg -i "$launch_master" -t 14 -an \
  -vf 'fps=30,scale=960:-2:flags=lanczos,fade=t=out:st=13.6:d=0.4:color=0xf5f5f5' \
  -c:v libx264 -preset slow -crf 28 -profile:v high -level:v 3.1 \
  -pix_fmt yuv420p -g 60 -maxrate 700k -bufsize 1400k \
  -movflags +faststart -map_metadata -1 \
  apps/web/public/videos/ecentic-launch-preview-20261008.mp4
ffmpeg -ss 1.4 -i "$launch_master" -frames:v 1 \
  -vf 'scale=1600:-2:flags=lanczos' -c:v libwebp -quality 82 \
  apps/web/public/videos/ecentic-launch-poster-20261008.webp
```

## Verification

- Approved master SHA-256 matches the final Overlapping transformation delivery.
- Both new MP4s decode completely. Full film: 3,480 frames at 60fps, 58.000s
  video with stereo AAC. Preview: 420 frames at 30fps, 14.000s, no audio stream.
- Both MP4s have their `moov` index before media data. The poster is 1600×900.
- Scoped Biome and whitespace checks pass. The component change consists only
  of three asset paths and the duration comment; loading and dialog behavior
  are preserved.
- The 5 October assets stay available for previously cached pages and rollback.
  This release is based on the production commit `b16d3236`.

| Asset | SHA-256 |
| --- | --- |
| Full film | `458afae6e4686cda724009ff410667684d5766ebee913916d70ecb95c6dfcf87` |
| Preview | `1f3e5a7f53d29b0ea8d82d1bd1a85f4c387660bab3fabbd08a622fc8874f0f5f` |
| Poster | `3711da6319af5aca072aa6ea20dd17bf4d50e3005bf2fb16b9ec6154ef443a18` |
