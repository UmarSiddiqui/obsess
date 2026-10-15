# Momo Tycoon

A browser tycoon game about running a momo stall on a Kathmandu street. Cook momos,
serve hungry customers, spend rupees on upgrades, hire staff, and grow from a street
stall into a busy Newari restaurant.

Everything is drawn in code with Three.js: Newari brick and carved windows, a pagoda
roof, a stupa with Buddha eyes, prayer flags, marigold garlands, brass lanterns, steam,
and a snowy Himalayan skyline.

## Run it

No build step and no `npm install`. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

Three.js 0.160.0 loads from `https://cdn.jsdelivr.net/npm/three@0.160.0/` through an
import map in `index.html`. Nothing else is fetched from the network.

## Controls

- **Steamers:** tap a steamer on the stall to load it with the item marked "Cooking" in the
  Cook tab. Tap it again when it is ready to collect the momos. The badge above each
  steamer shows the same state.
- **Customers:** tap a customer or their order bubble to serve them, once the tray holds
  what they ordered. Customers who wait too long walk off and cost reputation.
- **Panels:** Cook (steamers and menu), Upgrade (steamer speed, bigger baskets, recipe, extra
  baskets, decor), Staff (chefs and servers), Expand (stage requirements and achievements).
  On desktop the panel sits on the right. On phones it is a bottom sheet.
- **Camera:** drag the scene to turn the view slightly.

## Progression

- **Economy:** steamed momo sells for Rs 30. Jhol momo, C-momo and fried momo unlock for
  Rs 350, Rs 800 and Rs 1,500. Achar recipe upgrades raise every price.
- **Staff:** a chef loads empty steamers and collects finished ones. A server serves the
  first customer whose order is on the tray. Wages are paid every 60 seconds, together
  with rent once you have expanded.
- **Stages:** Street Stall, then Little Shop (Rs 6,000, reputation 35+), then Busy
  Restaurant (Rs 35,000, reputation 60+).
- **Achievements:** eight milestones that pay bonus rupees.

## Saving

Progress saves to `localStorage` under `momo-tycoon-save-v1`: every few seconds, on
actions, and when the page is hidden or closed. "Menu" in the top bar returns to the
title screen, and "Continue" resumes the saved game. Sound on/off is remembered too.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Entry point, import map, HUD, panels, title screen and styles |
| `js/main.js` | Wiring: input, layout, title screen and the frame loop |
| `js/sim.js` | Pure game logic: economy, cooking, customers, staff, paydays, saves |
| `js/data.js` | Menu, upgrades, decor, staff, stages and achievements (tune balance here) |
| `js/world.js` | Three.js scene: architecture, Himalayan backdrop, steamers, steam, flags, people |
| `js/ui.js` | DOM layer: HUD, panels, order bubbles, basket badges, toasts |
| `js/sfx.js` | Small WebAudio synth for coin, ding and pop sounds |
