# Hairline drawing kernel

`kernel.js` is an unchanged copy of the fixed Hairline creation kernel shipped with
the `hairline-create` skill by Lucas Marques. Original SHA-256 marker:
`8e2abcbdf63c7755195ee942c39e9c8ea6a539d1147e986dd1c153559121f075`.

The MIT license is included alongside it. The footer uses its shared visibility-aware
frame loop, pointer mapping and 700 ms discrete tweens; it does not change this kernel.
The user explicitly requested lettering here. The wordmark contours come from the
site's existing LT Superior Regular font, not a new logo or a third-party wordmark.

Figure code: `src/components/hairline/wordmark-figure.ts`.
Server-rendered paths: `src/components/marketing/wordmark-paths.json`.
