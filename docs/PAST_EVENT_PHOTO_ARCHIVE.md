# Past Event Photo Archive

The Past Events page uses a gallery manifest so historical media can be added without redesigning the page each time.

## Event folders

Store optimized event photos under:

- `dist/assets/past-events/bass-babes-recruitment-2022/`
- `dist/assets/past-events/groove-cruise-2022/`
- `dist/assets/past-events/wild-ones-takes-flight-2022/`

NOCTURNE continues to use its existing media library under `dist/assets/nocturne-2026/`.

## Recommended image preparation

For each historical photo, keep an approximately 1800 px full-size WebP and a 900 px WebP thumbnail when the source quality allows it. Preserve the original aspect ratio. Use clear lowercase filenames with hyphens.

Example:

- `bass-babes-recruitment-01-900.webp`
- `bass-babes-recruitment-01-1800.webp`

## Adding photos to a gallery

Edit `dist/assets/past-events/gallery-manifest.json` and add entries to the matching event's `photos` array.

Each photo supports:

- `thumb`: 900 px display image
- `full`: larger lightbox image
- `alt`: meaningful accessibility description
- `caption`: short public-facing caption
- `layout`: `standard`, `wide`, `half`, or `portrait`

The Past Events page will automatically render the gallery and lightbox. Events with no images retain a polished archive-ready empty state rather than broken image placeholders.

## QA

Static QA verifies every manifest image exists before release. Browser QA verifies the NOCTURNE gallery renders, opens in the lightbox, and restores keyboard focus after closing. The full visual QA suite includes the Past Events page at desktop, tablet, 430 px, 390 px, and 320 px widths.
