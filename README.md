# Shinji Kanda Collection

A dark-themed PWA that tracks a collection of every physical Pokémon TCG card illustrated by **Shinji Kanda**, in English and Japanese. Tap a card to mark it as collected. Progress is saved on the device, and you can export or import a backup JSON file to move it between devices.

## Data

`npm run cards` regenerates `src/data/cards.json` and the self-hosted images in `public/cards/`:

- **Card list, rarity and scans:** [Limitless TCG](https://limitlesstcg.com), exact artist search (`!artist:shinji_kanda`). Each card's artist is checked against its card page.
- **Prices:** Cardmarket trend price in EUR (from Limitless for English cards, [TCGdex](https://tcgdex.dev) for Japanese cards).
- **Manual fixes:** `data/overrides.json` (`exclude`, `extraCards`, and per-card `cards` overrides keyed by `uid`).

The script fails if any card has no image. A GitHub Action refreshes the data daily and commits any changes, and Vercel redeploys automatically.

## Development

```sh
npm install
npm run dev
```

Pokémon and all card artwork © Nintendo, Creatures, GAME FREAK and The Pokémon Company. This is a fan project and is not affiliated with them.
