# Card trailer media (prototype)

The banner card plays a self-hosted, muted, looping copy of the official trailer:

- `<clip>.webm`: AV1, 768x320, no audio, keyframe every 2 s
- `<clip>.mp4`: H.264 Main, 768x320, ~330 kbps, no audio, keyframe every 2 s, `+faststart`

The video files are not committed (see `.gitignore`). For a local build, put them here; in
production set `NEXT_PUBLIC_MEDIA_BASE` to the media host (for example a Cloudflare Pages project
serving `/clips`). If the files are missing, the card falls back to the static banner.

How the current file was made (official "Trailer" upload, MPAA card trimmed, letterbox cropped):

    yt-dlp -f 270 -o src.mp4 https://www.youtube.com/watch?v=JerVrbLldXw
    ffmpeg -ss 6.25 -i src.mp4 -an -sn -dn -map_metadata -1 \
      -vf "crop=1920:800:0:140,scale=768:320:flags=lanczos,format=yuv420p" \
      -c:v libx264 -preset slow -profile:v main -level 3.1 -crf 27 -maxrate 450k -bufsize 900k \
      -g 48 -keyint_min 24 -movflags +faststart captain-america-the-first-avenger.mp4
    ffmpeg -ss 6.25 -i src.mp4 -an -sn -dn -map_metadata -1 \
      -vf "crop=1920:800:0:140,scale=768:320:flags=lanczos,format=yuv420p" \
      -c:v libsvtav1 -preset 6 -crf 42 -g 48 captain-america-the-first-avenger.webm
