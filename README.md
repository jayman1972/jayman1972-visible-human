# The Visible Human

An interactive 3D human body for phones, tablets and desktops, in the spirit of the
transparent "Visible Man" model kits. Take the body apart layer by layer, slice organs
open, and watch the heart, lungs, blood, nerves and gut at work.

**Live app:** https://jayman1972.github.io/jayman1972-visible-human/

On an iPhone or iPad, open the link in Safari, tap **Share**, then **Add to Home Screen**.
It opens full screen like an app and works offline after the first visit.

## Features

- About 3,100 anatomical structures across nine layers: skin, muscles, ligaments, skeleton,
  lymph nodes, heart and vessels, brain and nerves, and organs.
- Explode the body into its parts and put it back together (scroll, or the rail on the right).
- Tap any part for a plain-language description, what it does, and interesting facts.
- Selected internal organs are shown through a cutaway window in the tissue in front of them.
- Cross-sections (sagittal, coronal, transverse) of a single organ or the whole body.
- Full-detail models stream in automatically when you zoom in close.
- Animations with synthesized sound: heartbeat with valve sounds, breathing, blood flow,
  nerve signals, brain activity, digestion, urine flow and airflow. Heart rate is adjustable.
- Guided tours with optional narration.
- Male and female bodies, including reproductive anatomy.
- **Ken mode** and **Barbie mode**: a family-friendly view that smooths over the genitals and
  nipples like a doll. The internal organs, including the uterus, ovaries and prostate, stay visible.
  The setting is remembered on each device.

## Controls

| | Phone and tablet | Desktop |
|---|---|---|
| Rotate | Drag | Drag, or the arrow keys |
| Zoom | Pinch | Ctrl + scroll, trackpad pinch, the + − buttons, or the + − keys |
| Move | Two-finger drag | Right-drag |
| Explode | Swipe the rail on the right | Scroll, the rail, or E (and [ ] in steps) |
| Learn about a part | Tap it | Point at it for its name; click for details; double-click to zoom to it |
| Start over | The house button (Restore) | The house button, or 0 |

More keys on desktop: 0 or Home restore the starting view, R reset the camera, / search, F focus, I isolate, H hide, M motion and sound,
C cross-section, T tours, B switch body, 1–8 layers, Space start or stop all motion,
Esc close or deselect. Press ? for the full list in the app.

## Repository layout

| Folder | Contents |
|---|---|
| `docs/` | The built site that GitHub Pages serves. |
| `app/` | App source: Three.js renderer, shaders, UI, animations, sound, tours and service worker. |
| `pipeline/` | Node scripts that turn the Z-Anatomy models into the compressed packs in `docs/data`. |

## Rebuilding

The `pipeline/` scripts need the Z-Anatomy PC version, MakeHuman's data files and Node 20 or later.

1. In `pipeline/`, run `npm install`.
2. Convert the Z-Anatomy FBX files (`Resources/Models/FBX/*100.fbx` and `CardioVascular41.fbx`)
   to GLB with the bundled `fbx2gltf` binary, and save them in `pipeline/glbhi/`.
3. Get MakeHuman's data (CC0) from [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman):
   the `makehuman/data/targets` and `makehuman/data/rigs` folders, and the base mesh
   `makehuman/data/3dobjs/base.obj`. Point `MH_DATA` at the `data/` folder (with a trailing slash)
   and `MH_BASE` at `base.obj`. The female body shape is fitted from these files.
4. Run `node build2.mjs out2` to write `out2/base`, `out2/hi` and `out2/manifest.json`.
5. Optionally, run `node refs.mjs` from a folder that contains `za/Assets/Descriptions`
   to regenerate the atlas notes in `refs.json`.
6. In `app/`, run `./build.sh`, then copy `app/dist/` into `docs/`.

## Credits and licenses

- 3D anatomy is derived from [Z-Anatomy](https://www.z-anatomy.com) (CC BY-SA 4.0), which is
  built on BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japan). The
  converted models in `docs/data` are shared under the same CC BY-SA 4.0 license.
- The atlas notes come from Wikipedia text bundled with Z-Anatomy (CC BY-SA).
- The female body shape comes from [MakeHuman](http://www.makehumancommunity.org)'s average
  adult man and woman (CC0). Their difference is fitted onto this body: breasts, waist, hips,
  shoulders, limbs and face.
- The female reproductive organs, breast tissue and the pudendal region are modeled
  procedurally from standard adult measurements. They are not scan-based.
- The female face refinements (`pipeline/face.mjs`) and the hair, eyebrows and eyelashes shown
  with solid skin (`pipeline/hair.mjs`) are generated for this app.
- In the app, the credits and licenses are under Help (?) › About & sources.
