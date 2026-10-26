# Troubleshooting

## Media never becomes ready

Check the file format, media-worker status, Redis connection, S3-compatible storage, and the required native binary: FFmpeg for video, Poppler for PDF, or LibreOffice for presentations. Search worker logs by media identifier.

## Screen remains pending

Confirm that the pairing code had not expired, find the new request under **Écrans**, and provide its required name, location, and channel before approval. Reload `/display` if the device is slow to update.

## Screen displays no content

Check, in order:

1. the screen is active and assigned to the expected channel
2. the channel has a valid template
3. a schedule is active at the current channel-local time
4. the selected playlist contains ready, active media
5. the device can reach the application and signed object-storage URLs
6. system clocks and the channel timezone are correct.

## Wrong playlist is displayed

Look for a higher-priority event or recurring schedule, then verify the channel timezone. Correct conflicting rules instead of modifying the fallback playlist.

## Widget is empty

Validate its city, feed URL, provider, stop identifiers, and server-side network access. Check provider rate limits and application logs.
