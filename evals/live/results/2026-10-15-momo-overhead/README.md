# Momo Tycoon fully overhead: Haiku 5.5 with /obsess

One run on `claude-haiku-5-5` with `/obsess`, starting from the best top-down build (obsess-1 from the [top-down comparison](../2026-10-15-momo-topview/README.md)). Brief: [brief.txt](brief.txt).

Graded with [`grade_topview.js`](../../grade_topview.js) at `MIN_PITCH=80`: **5/5**. The camera is orthographic at 90° in all five views, and the floor is fully visible and uncovered. The serve loop works, saves survive a reload, and there are no errors. 27 minutes and about $2.90 (CLI estimate).

What the run did: switched to a straight-down orthographic camera that fits the floor plan to the free screen area, replaced the Himalayan backdrop with neighbouring rooftops, added steamer lids for the cooking state, laid prayer flags and the shop sign flat, widened shoulders and added hat brims so people read from above, and made badges and order labels avoid each other.

Reviewer notes from the screenshots (Claude, not measured): it reads as a map, but the palette is muddy brown and people are small. On the restaurant stage the front-row badges cover the sign. On phones the plan is small, and one order label is clipped at the left edge.

After finishing, the agent was woken about 20 times by its own expired background watchers. Each answered "nothing pending", which added roughly $0.30.
