# Shinji Kanda Collection

A dark-themed PWA that tracks a collection of every physical Pokémon TCG card illustrated by **Shinji Kanda**, in English and Japanese. Tap a card to mark it as collected. Progress syncs across devices behind a single password, and you can still export or import a JSON backup.

## Data

`npm run cards` regenerates `src/data/cards.json` and the self-hosted images in `public/cards/`:

- **Card list, rarity and scans:** [Limitless TCG](https://limitlesstcg.com), exact artist search (`!artist:shinji_kanda`). Each card's artist is checked against its card page.
- **Prices:** Cardmarket trend price in EUR (from Limitless for English cards, [TCGdex](https://tcgdex.dev) for Japanese cards).
- **Manual fixes:** `data/overrides.json` (`exclude`, `extraCards`, and per-card `cards` overrides keyed by `uid`).

The script fails if any card has no image. A GitHub Action refreshes the data daily and commits any changes, and Vercel redeploys automatically.

## Sync

- `api/collection.ts` is a Vercel function that stores the collection as one private JSON file in Vercel Blob (`shinji-progress-collection` store).
- Each card's entry is last-write-wins (`{ o: 0|1, t: timestamp }`), so offline edits from several devices merge without losing changes.
- Every request needs the `x-password` header to match `APP_PASSWORD`. Keep it in `.env` locally (gitignored) and in the Vercel project's environment variables. To change the password, update both and redeploy.

## Development

```sh
npm install
npx vercel env pull .env.local   # Blob token for the local API
npm run dev                      # also serves /api/collection locally
```

Pokémon and all card artwork © Nintendo, Creatures, GAME FREAK and The Pokémon Company. This is a fan project and is not affiliated with them.
