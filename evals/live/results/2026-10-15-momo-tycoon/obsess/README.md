# Momo Tycoon

A browser tycoon game: run a Nepali momo stall on a Kathmandu street and grow it into a busy restaurant.
Steam and serve customers, spend rupees on upgrades, hire cooks and servers, and expand from a
street stall to a small shop to a restaurant. Everything is drawn in 3D with Three.js.

## Run it

No build step and no npm install. Serve the folder with any static server and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Three.js 0.160.0 loads from `cdn.jsdelivr.net`, so the first load needs internet access.
Nothing else is fetched: all art is generated in code.

## How to play

- **Tap a gold ring** on a steamer (or the wok) to start a batch. It cooks in the background.
- **Tap a customer** in the queue to serve a plate once it is ready. Serve quickly for a tip.
- **Hire cooks** to keep steamers loaded automatically, and **servers** to serve customers for you.
- **Upgrades** make steaming faster, add baskets and batch size, and boost your prices.
- **Menu** adds Jhol momo, Fried momo and C-momo (the last two need the Fryer Wok).
- **Decor** adds prayer flags, marigold garlands and brass lanterns.
- **Shop** expands the stall once your cash, reputation and customer count are high enough.
- Each day ends with a report: sales, ingredients, wages and rent.

Controls: tap or click to act, drag to look around, pinch or scroll to zoom.

Progress saves automatically in this browser's `localStorage` (key `momoTycoon.save.v1`).
The menu (≡) has sound on/off and an erase-progress option.

## Layout

```
index.html        entry point and UI markup
css/style.css     interface styles (desktop side panel, phone bottom sheet)
js/config.js      menu, upgrades, staff, decor, shop levels and tuning numbers
js/state.js       game rules, economy, day cycle and save/load
js/world.js       the 3D street: Newari buildings, pagoda, stupa, Himalayas, stall and people
js/ui.js          HUD, order bubbles, panels, modals and toasts
js/audio.js       small WebAudio sound effects
js/main.js        wiring, input (tap, drag, pinch, wheel) and the frame loop
```

For debugging, the running game is available as `window.momoTycoon` (`game`, `world`, `ui`).
