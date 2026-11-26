# sosa-fam-food-storage

This app helps us keep track of the food in our pantry, fridge and basement storage room, so that at the grocery store we know what we have and what to restock. It is an Expo / React Native app for iPhone and Android, and it talks to [sosa-fam-api](https://github.com/SosaNuvol/sosa-fam-api). It shares sign-in, families and stores with the family app ([sosa-fam-data-sharing](https://github.com/SosaNuvol/sosa-fam-data-sharing)).

## What it does

- **Locations.** Every family starts with Pantry, Fridge and Basement. Add more (a garage freezer) under Locations.
- **Counts where it matters, a tap where it doesn't.** The pantry and basement keep exact counts with +/- buttons. The fridge changes too fast for that, so each item there is just Have, Low or Out.
- **Scan to add or find.** Point the camera at a barcode. A known item opens; a new one opens the add form with the name and picture filled in from [Open Food Facts](https://world.openfoodfacts.org) (only the barcode is sent).
- **Minimum and target.** Give an item a minimum (keep at least 10 lb of rice) and a target (restock up to 25 lb). The totals count every location.
- **Need to buy.** Items below their minimum, and fridge staples (milk, eggs) marked Low or Out, are listed by store with how much to buy. Add them to a family grocery list in one tap. They show up in the family app, tagged with the item's usual store, where whoever is shopping checks them off.
- **Put away.** After shopping, items checked off on a list go into a location, which adds them to the counts and takes them off the list.
- **Move.** "Bring up 2 from the basement" moves stock between locations.
- **History.** Who changed what, and when.
- **Live.** Changes on one phone show up on the others right away (SignalR). Screens also reload with pull-to-refresh.

## Run it

You need Node.js 20 or later, the API running (see the sosa-fam-api README), and a development build or Expo Go on your phone. The barcode scanner uses `expo-camera`, which Expo Go includes.

```bash
npm install
# Point the app at the API. A phone needs your computer's LAN address, not localhost.
echo "EXPO_PUBLIC_API_URL=http://192.168.1.50:5000" > .env.local
npx expo start
```

Checks before pushing:

```bash
npm run typecheck
```

## Layout

| Path | What it is |
| --- | --- |
| `src/app/home.tsx` | Everything on hand, by location, with +/- or Have / Low / Out |
| `src/app/needs.tsx` | What to buy, by store; adds it to a grocery list |
| `src/app/product/[productId].tsx` | One item: stock per location, move, restock levels |
| `src/app/product-form.tsx` | Add or edit an item (prefilled from a barcode) |
| `src/app/scan.tsx` | Barcode scanner |
| `src/app/put-away.tsx` | Bought items into locations |
| `src/app/activity.tsx` | History |
| `src/app/locations.tsx` | Add or remove locations |
| `src/app/sign-in.tsx`, `welcome.tsx` | Sign in; create or join a family (same as the family app) |
| `src/lib/api.ts`, `auth.tsx`, `tokenStore.ts` | API client, sign-in state, secure token storage (shared with the family app) |
| `src/lib/realtime.ts` | Live updates for a household |
| `src/lib/pantry.ts` | Formatting and the Open Food Facts lookup |
| `src/lib/types.ts` | Shapes returned by the API |

## Builds

Use EAS to build and ship to TestFlight and Google Play internal testing (`npx eas-cli@latest build`). The bundle id is `com.sosanuvol.sosapantry`; change it in `app.json` before the first build if you prefer another.
