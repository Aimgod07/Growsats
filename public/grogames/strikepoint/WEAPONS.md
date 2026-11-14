# Strikepoint tactical weapons — NovaGames only

Four separately modeled weapon silhouettes are available through the existing loadout selector:

- AR-7: carbine receiver, curved magazine, ventilated rails, forward grip, adjustable stock and holographic sight.
- VX-9: short barrel, compact handguard, straight magazine and reflex sight.
- BREACH-6: tubular magazine, ribbed moving pump, side-shell carrier and iron sights.
- SENTINEL: long barrel, detachable magazine, scope with translucent lens and folded bipod.

First-person arms now have olive gloves and camouflage sleeves. Magazines, bolts and the shotgun pump animate separately. Aiming aligns the sight to the camera. Existing damage, ammunition, fire rate, mission rules and reload durations are preserved.

assets/audio contains four fire and four reload WAV clips. These are original layered effects inspired by the supplied video's punchy gunfire and mechanical reload character; they are not extracted game audio. The rifle, SMG, shotgun and marksman use different firing timbres and reload timelines. Reload playback matches the existing 1.8s / 1.45s / 2.35s / 2.2s durations. Pause cancels voices, resume uses the remaining reload offset, and returning to the lobby or restarting cancels playback. The existing mute control applies to all sounds.

Run node verify-weapons.cjs to check all 20 gun/finish combinations, first-person rigs, animated parts, clip uniqueness/durations, and audio stop/resume behavior. Run node verify-maps.cjs for the map regression checks. Browser visual and on-device listening checks remain required; the browser tooling was unavailable in this session.

No shared game assets, other NovaGames components, original project files, deployment, or APK builds were changed.
