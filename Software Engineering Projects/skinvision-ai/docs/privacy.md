# Privacy notes

## What happens to an uploaded photo

1. The browser sends the file directly to the backend's `/analyze`
   endpoint over `multipart/form-data`. It is never sent anywhere else.
2. The backend reads the bytes into memory (`UploadFile.read()`),
   decodes them, runs quality/classification/detection, and returns a
   JSON response. **The raw bytes and decoded image array are never
   written to disk and never logged** — see the comment in
   `backend/app/routers/analyze.py` and the logging setup in
   `backend/app/main.py` (which only ever logs the request path, never
   the body).
3. Once the request finishes, Python garbage-collects the image data.
   There is no database, object store, or cache in this scaffold that
   an image could end up in.
4. On the frontend, the selected file lives only in an in-memory React
   context (`frontend/lib/analysis-store.tsx`) as an `ObjectURL`.
   Nothing is written to `localStorage`, `sessionStorage`, or cookies.
   Refreshing the page clears everything.

This matches the PRD's default retention policy (section 2.1: "store
no uploaded images by default") without needing a retention/deletion
job, because there is nothing to delete.

## If you add persistence later

The PRD leaves room for an opt-in "save my results" feature (section
2.1 mentions temporary storage as a possible extension). If you build
that:
- Get explicit, separate consent for storage before analysis — never
  bundle it with a general terms-of-service acceptance.
- Encrypt at rest and in transit.
- Give users a way to delete their data on demand.
- Re-run a privacy review before shipping; this scaffold's "nothing is
  ever stored" guarantee stops being true the moment you add a
  database write path, so it deserves fresh scrutiny rather than an
  assumption that the rest of the app is still compliant.

## Third parties

This scaffold calls no third-party APIs with the uploaded image (no
cloud vision API, no analytics SDK that could capture the image, no
external logging service). If you add one, document it here and make
sure it's covered by your privacy policy and any applicable consent
flow.
