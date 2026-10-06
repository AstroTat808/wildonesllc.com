# Past Event Archive System

The Wild Ones historical archive is manifest-driven. Each historical event has a dedicated page with structured sections for:

- event story
- confirmed DJs / artists
- flyer and promotional artwork
- full photo gallery with lightbox
- memorabilia and physical/digital artifacts

The source of truth is `dist/assets/past-events/gallery-manifest.json`.

## Dedicated event pages

- `/bass-babes-recruitment-2022.html`
- `/groove-cruise-2022.html`
- `/wild-ones-takes-flight-2022.html`

NOCTURNE remains both a historical milestone and a full producer-facing case study at `/nocturne-2026.html`.

## Windows photo importer

The repository includes:

- `scripts/import-past-event-photos.ps1` — import engine
- `scripts/import-past-event-photos.bat` — Windows launcher

The importer:

1. scans JPG, JPEG, PNG, WebP, HEIC/HEIF, TIFF and BMP files recursively
2. auto-orients each source image
3. strips unnecessary metadata
4. creates a 900 px WebP and 1800 px WebP
5. generates stable lowercase filenames
6. writes the images into the correct `dist/assets/past-events/<event-key>/` folder
7. appends gallery entries to the manifest
8. records the original source filename so re-running the importer does not duplicate previously imported photos

ImageMagick is preferred. FFmpeg is used automatically when ImageMagick is unavailable.

### Import one folder into one event

From the repository root:

    scripts\import-past-event-photos.bat "C:\Photos\Huntington Beach" bass-babes-recruitment-2022

Other event keys:

    groove-cruise-2022
    wild-ones-takes-flight-2022
    nocturne-2026

### Batch import several event folders

Create a parent folder such as:

    C:\Photos\Wild Ones Archive\
      bass-babes-recruitment-2022\
      groove-cruise-2022\
      wild-ones-takes-flight-2022\

Then run:

    scripts\import-past-event-photos.bat "C:\Photos\Wild Ones Archive"

The importer detects matching event-key folders automatically.

### Rebuild an event gallery

PowerShell supports `-Rebuild` when you intentionally want to regenerate an event's gallery entries:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\import-past-event-photos.ps1 -Source "C:\Photos\Huntington Beach" -EventKey bass-babes-recruitment-2022 -Rebuild

## Manifest fields

Each event supports:

- `artists`: confirmed people with `name` and optional `role`
- `flyers`: promotional image records
- `photos`: event photo records
- `memorabilia`: tickets, passes, wristbands, merchandise or other artifacts

Photo records support:

- `thumb`: 900 px display WebP
- `full`: 1800 px lightbox WebP
- `alt`: accessibility description
- `caption`: public caption
- `layout`: `standard`, `wide`, `half`, or `portrait`
- `source`: original filename used for importer deduplication

The importer creates usable initial captions and alt text, but archival descriptions should be reviewed before publishing.

## Flyer artwork and memorabilia

Flyers and memorabilia are not auto-classified from ordinary photo imports because the distinction should be deliberate. Add those records to the matching `flyers` or `memorabilia` array after placing optimized image files in the event asset folder.

## QA

Release Certification verifies:

- all dedicated historical routes exist
- all manifest arrays use the expected schema
- referenced flyer, photo and memorabilia assets exist
- historical pages expose the expected archive sections
- empty archive states render cleanly when source material has not been added yet
- the NOCTURNE archive gallery and lightbox work
- lightbox keyboard focus is restored on close
- the California-to-Hawaiʻi evolution section is present
- Past Events and all historical pages pass visual QA at desktop, tablet, 430 px, 390 px and 320 px
