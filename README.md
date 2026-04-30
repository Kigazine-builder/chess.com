# Chess.com Newest Members Widget

This project generates a small HTML page showing the 3 newest public members of a Chess.com club.

## Files

- `club.config.json`: change the club slug and title here.
- `generate-newest-members.mjs`: fetches club members from the Chess.com public API and writes the widget HTML.
- `docs/index.html`: generated output for GitHub Pages.
- `.github/workflows/update-newest-members.yml`: refreshes the output on a schedule.

## Quick Start

1. Open [`club.config.json`](/Users/ethan/Desktop/chess-club-newest-members/club.config.json) and set your real club slug.
2. Run:

```bash
cd /Users/ethan/Desktop/chess-club-newest-members
npm run build
```

3. Push this folder to a GitHub repo.
4. In GitHub, enable Pages from the `main` branch and `/docs` folder.
5. Wait for the Actions workflow to run, then use the Pages URL as your hosted widget page.

## Notes

- The Chess.com public API provides club members with `joined` timestamps.
- The club members API can be cached on Chess.com's side, so updates may not be instant.
- If Chess.com does not let you embed live HTML in the sidebar, link to the hosted page or switch to an image-based version later.
