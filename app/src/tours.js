// Guided tours. Each step sets up the scene (layers, body, motion, selection,
// slice, camera) and shows a short caption. Groups are "system|Group name|side".
const ORGANS_ONLY = { skin: false, muscles: false, joints: false, skeleton: false, lymph: false, vessels: false, nerves: false, organs: true };
const CV = { muscles: false, joints: false, skeleton: true, lymph: false, vessels: true, nerves: false, organs: false };

export const TOURS = [
  {
    kicker: 'Circulation', title: 'The beating heart',
    blurb: 'Watch the four chambers squeeze, hear the valves close, and follow blood around the body.',
    steps: [
      { title: 'A fist-sized pump', text: 'The heart sits in the middle of the chest, tilted to the left, cradled between the lungs. Tap play and listen: every "lub-dub" is a beat.', skin: 'clear', layers: CV, motion: ['heart'], bpm: 66, explode: 0, group: 'vessels|Heart' },
      { title: 'Four chambers', text: 'The two upper chambers (atria) collect blood. The two lower chambers (ventricles) pump it out. The atria squeeze first, then the ventricles.', motion: ['heart'], group: 'vessels|Heart', isolate: true },
      { title: 'Look inside', text: 'A slice through the heart shows its thick muscular walls. The left ventricle has the thickest wall because it pumps blood to the whole body.', motion: ['heart'], group: 'vessels|Heart', isolate: true, clip: { axis: 'coronal', pos: 0.05 } },
      { title: 'Out through the arteries', text: 'Each beat sends a pressure wave racing down the arteries. That wave is the pulse you feel at your wrist.', motion: ['heart', 'blood'], layers: CV, view: { target: [0, 0.95, 0], dir: [0, 0.05, 1], dist: 3.2 } },
      { title: 'Back through the veins', text: 'Veins carry blood back to the heart. They are shown in blue, the standard textbook color. Real venous blood is dark red.', motion: ['heart', 'blood'], view: { target: [0.2, 0.55, 0], dir: [0.3, 0.1, 1], dist: 1.6 } },
      { title: 'Now run!', text: 'During exercise your heart can beat more than twice as fast, and your breathing speeds up to match.', motion: ['heart', 'blood', 'breath'], bpm: 150, view: { target: [0, 1.25, 0], dir: [0.25, 0.1, 1], dist: 1.2 } },
    ],
  },
  {
    kicker: 'Respiration', title: 'Take a breath',
    blurb: 'See the diaphragm drop, the ribs lift and the lungs fill with air.',
    steps: [
      { title: 'Two spongy lungs', text: 'The right lung has three lobes and the left has two, leaving room for the heart.', skin: 'clear', layers: { ...ORGANS_ONLY, skeleton: true }, motion: ['breath'], bpm: 66, explode: 0, group: 'organs|Lungs' },
      { title: 'The diaphragm does the work', text: 'When the dome-shaped diaphragm contracts, it flattens and pulls downward, sucking air into the lungs.', layers: { ...ORGANS_ONLY, skeleton: true, muscles: true }, motion: ['breath'], part: ['Diaphragm'], view: { target: [0, 1.15, 0], dir: [0.6, 0.2, 1], dist: 0.9 } },
      { title: 'Ribs swing up and out', text: 'Muscles between the ribs lift the rib cage like bucket handles, making the chest wider.', layers: { ...ORGANS_ONLY, skeleton: true, muscles: false }, motion: ['breath'], view: { target: [0, 1.25, 0], dir: [1, 0.1, 0.3], dist: 0.9 } },
      { title: 'Air streams in', text: 'Air travels down the windpipe and through branching bronchi, about 23 levels of branches, to millions of tiny air sacs.', layers: { ...ORGANS_ONLY }, motion: ['breath', 'air'], group: 'organs|Tracheobronchial tree' },
    ],
  },
  {
    kicker: 'Digestion', title: 'Journey of a meal',
    blurb: 'Follow food from the esophagus to the colon as waves of muscle push it along.',
    steps: [
      { title: 'Down the esophagus', text: 'Swallowed food is pushed to the stomach by waves of muscle contraction called peristalsis. It works even upside down.', skin: 'clear', layers: { ...ORGANS_ONLY }, motion: ['gut'], explode: 0, part: ['Oesophagus'] },
      { title: 'The churning stomach', text: 'The stomach mixes food with acid and enzymes into a soupy paste called chyme.', motion: ['gut'], part: ['Stomach'] },
      { title: 'Helpers: liver and pancreas', text: 'The liver makes bile to break down fat; the pancreas adds digestive enzymes and controls blood sugar.', motion: ['gut'], part: ['Liver'] },
      { title: 'The small intestine', text: 'Most nutrients are absorbed here. Its lining is folded into millions of villi that massively increase its surface.', motion: ['gut'], part: ['Jejunum'] },
      { title: 'The large intestine', text: 'The colon absorbs water and is home to trillions of helpful bacteria.', motion: ['gut'], group: 'organs|Colon' },
    ],
  },
  {
    kicker: 'Nervous system', title: 'Lightning in the nerves',
    blurb: 'Signals race from the brain and spinal cord to every muscle in milliseconds.',
    steps: [
      { title: 'Command center', text: 'The brain has about 86 billion neurons. Watch waves of activity ripple across its surface.', skin: 'clear', layers: { muscles: false, joints: false, skeleton: true, lymph: false, vessels: false, nerves: true, organs: false }, motion: ['brain'], explode: 0, group: 'nerves|Brain' },
      { title: 'The spinal cord', text: 'A cable about 45 cm long carries messages between brain and body, and handles fast reflexes on its own.', motion: ['nerves', 'brain'], group: 'nerves|Spinal cord' },
      { title: 'Out to the body', text: 'Thirty-one pairs of spinal nerves branch out to the skin, muscles and organs. The fastest signals travel over 100 m per second.', motion: ['nerves'], view: { target: [0, 0.95, 0], dir: [0, 0.05, 1], dist: 3.2 } },
      { title: 'The longest nerve', text: 'The sciatic nerve, as thick as your thumb, runs down the back of each thigh.', motion: ['nerves'], part: ['Sciatic nerve', 'L'] },
    ],
  },
  {
    kicker: 'Cross-sections', title: 'Inside the brain',
    blurb: 'Slice the brain like a scanner to see the structures hidden deep inside.',
    steps: [
      { title: 'A midline slice', text: 'Cutting down the middle reveals the corpus callosum, the bridge of 200 million fibers that links the two halves.', skin: 'off', layers: { muscles: false, joints: false, skeleton: false, lymph: false, vessels: false, nerves: true, organs: false }, motion: [], explode: 0, group: 'nerves|Brain', isolate: true, clip: { axis: 'sagittal', pos: 0.02, flip: false } },
      { title: 'A horizontal slice', text: 'A transverse cut shows grey matter on the outside, white matter wiring inside, and the deep clusters of the basal ganglia and thalamus.', group: 'nerves|Brain', isolate: true, clip: { axis: 'transverse', pos: 0.22 } },
      { title: 'A coronal slice', text: 'A front-facing cut passes through the fluid-filled ventricles that cushion the brain.', group: 'nerves|Brain', isolate: true, clip: { axis: 'coronal', pos: -0.05 } },
    ],
  },
  {
    kicker: 'Reproduction', title: 'Two bodies',
    blurb: 'Compare the male and female reproductive systems and morph between the two.',
    steps: [
      { title: 'The male system', text: 'The testes make sperm and testosterone. The prostate and seminal glands add fluid that nourishes the sperm.', pgText: 'Deep in the pelvis, the prostate and seminal glands add fluid that nourishes sperm. Ken mode hides the external parts.', female: false, skin: 'clear', layers: { ...ORGANS_ONLY, skeleton: true }, motion: [], explode: 0, group: 'organs|Male genital system' },
      { title: 'The female system', text: 'The ovaries hold eggs and make estrogen and progesterone. The uterus, a muscular organ about the size of a pear, can stretch to hold a full-term baby.', female: true, group: 'organs|Female genital system' },
      { title: 'Inside the uterus', text: 'A slice shows the thick muscular wall and the lining (endometrium) that thickens and sheds each menstrual cycle.', female: true, part: ['Uterus'], clip: { axis: 'sagittal', pos: 0.02 } },
      { title: 'The pelvis is different too', text: 'A wider pelvis with a rounder opening makes childbirth possible. Watch the body change shape as it morphs.', female: true, skin: 'clear', layers: { ...ORGANS_ONLY, skeleton: true }, view: { target: [0, 0.88, 0], dir: [0, 0.15, 1], dist: 1.1 } },
    ],
  },
  {
    kicker: 'Movement', title: 'Built to move',
    blurb: 'Take the body apart layer by layer: skin, muscle, bone.',
    steps: [
      { title: 'Over 600 muscles', text: 'Muscles can only pull. They work in pairs: when the biceps bends the elbow, the triceps straightens it.', skin: 'off', layers: { muscles: true, joints: false, skeleton: true, lymph: false, vessels: false, nerves: false, organs: false }, motion: [], explode: 0, view: { target: [0, 0.95, 0], dir: [0.3, 0.05, 1], dist: 3 } },
      { title: 'Peel the layers', text: 'Exploding the body separates the muscles from the skeleton underneath.', explode: 0.55 },
      { title: '206 bones', text: 'Bones are living tissue, constantly rebuilt. More than half of them are in your hands and feet.', layers: { muscles: false, skeleton: true, joints: true }, explode: 0.85 },
    ],
  },
];
