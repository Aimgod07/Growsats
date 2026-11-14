# Strikepoint outdoor maps — NovaGames only

Select Coastal Citadel, Harbor Works, or Pine Ridge under Deployment. Use Explore 3D Map for a live overhead view, then Deploy Here. Escape returns from the overview to the loadout.

- Coastal Citadel: elevated church square, four stair approaches, village lanes, lighthouse, palms and ocean.
- Harbor Works: raised warehouse apron, two stair approaches, shipping-container lanes, truck cover, harbor crane and ocean.
- Pine Ridge: raised homestead, timber cabins, barns, fences, tree cover and forest horizon.

All maps have a 64 × 64 playable area. Rendering, minimap, collision and bot navigation share maps-data.js. Stairs use a continuous walking surface with shallow visual treads; bots and bullets account for elevation. Building interiors are solid cover; the routes are outside. Perimeter walls bound play, while the surrounding landscape is scenery.

The style is a locally generated 3D interpretation of the supplied references, not a photographic recreation. Surface textures, bump detail, foliage, atmospheric sky and water are generated locally. Static geometry is merged by material, device pixel ratio is capped, and touch devices use lower shadow resolution and fewer distant trees. No remote assets or new packages are required.

Verification: node verify-maps.cjs checks map connectivity, clear spawns, stair ascent/descent, collision, gunfire occlusion, enemy simulation and Three.js geometry budgets. Automated browser tools were unavailable; appearance, WebGL shader rendering and actual phone frame rates still need device testing.

Only this strikepoint directory was edited. No app, PMS, backend, shared game engine, deployment, or APK rebuild was changed.
