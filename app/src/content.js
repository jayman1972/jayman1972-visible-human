// Curated, high-school level notes for the structures in the model.
// Each entry: d = what it is, f = what it does, x = interesting facts.
// Parts without their own entry fall back to the nearest group they belong to
// (e.g. a fold of the brain -> its lobe), so every tap gets a useful answer.

const E = {};
function add(keys, d, f, x = []) {
  for (const k of [].concat(keys)) E[norm(k)] = { d, f, x };
}
function norm(s) {
  return String(s).toLowerCase().replace(/[’']/g, '').replace(/[()[\]*.]/g, ' ').replace(/[-–_/]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ===========================================================================
// SYSTEMS / BIG GROUPS
// ===========================================================================
add(['skeletal system', 'axial skeleton', 'appendicular skeleton'],
  'The skeleton is the body’s internal frame: about 206 bones in an adult, held together at joints by ligaments and cushioned by cartilage. The axial skeleton (skull, spine, ribs) runs down the middle; the appendicular skeleton is the limbs and the girdles that attach them.',
  'Bones hold you up, protect soft organs, give muscles something to pull on, store calcium and phosphorus, and make blood cells in their marrow.',
  ['Babies have roughly 270–300 bony pieces at birth. Many fuse as you grow, leaving about 206.', 'Bone is alive. Cells constantly dissolve and rebuild it, so your skeleton is largely renewed about every 10 years.', 'More than half of your bones are in your hands and feet.']);
add(['muscular system'],
  'Skeletal muscles are bundles of long, stretchy cells that attach to bones through tendons. There are over 600 of them, making up roughly a third to two-fifths of body weight.',
  'Muscles can only pull, never push. They work in opposing pairs (like biceps and triceps) to move joints, hold your posture and make heat.',
  ['Shivering is your muscles rapidly contracting to generate heat.', 'Even at rest, muscles stay slightly tensed (muscle tone), which helps hold your posture.']);
add(['skin', 'regions of human body'],
  'Skin is the body’s largest organ. It has an outer layer (epidermis) of constantly replaced cells and a deeper layer (dermis) with blood vessels, nerves, hair roots and sweat glands.',
  'It keeps germs out and water in, senses touch, pain and temperature, makes vitamin D in sunlight, and cools you down by sweating.',
  ['An adult’s skin covers about 1.5–2 square meters and weighs around 4 kg.', 'You shed tens of thousands of skin cells every minute, and some household dust is old skin.', 'Skin is thinnest on the eyelids (about 0.5 mm) and thickest on the upper back and the soles of the feet.']);
add(['cardiovascular system', 'systemic arteries', 'systemic veins'],
  'The cardiovascular system is the heart plus a network of blood vessels: arteries carry blood away from the heart, veins bring it back, and microscopic capillaries connect them.',
  'It delivers oxygen, nutrients and hormones to every cell and carries away carbon dioxide and waste.',
  ['Laid end to end, all the blood vessels in an adult would stretch roughly 100,000 km, more than twice around the Earth.', 'In this model arteries are red and veins are blue, the standard textbook colors. Real venous blood is dark red, not blue.']);
add(['nervous system & sense organs', 'nervous system', 'central nervous system', 'peripheral nervous system'],
  'The nervous system is the body’s wiring. The central nervous system is the brain and spinal cord; the peripheral nervous system is the nerves that branch out to every muscle, organ and patch of skin.',
  'It senses the world, makes decisions, stores memories and sends signals that move muscles and control organs, mostly in milliseconds.',
  ['The fastest nerve signals travel at over 100 meters per second, about 400 km/h.', 'Your brain has roughly 86 billion neurons.']);
add(['visceral systems'],
  'The viscera are the soft internal organs of the chest and abdomen: the digestive, respiratory, urinary, reproductive, endocrine and lymphoid organs.',
  'Together they turn food into fuel, swap gases with the air, filter blood, make hormones and help fight infection.');

// ===========================================================================
// SKULL & FACE
// ===========================================================================
add(['cranium', 'bones of cranium', 'skull', 'neurocranium', 'viscerocranium', 'facial bones'],
  'The skull is made of 22 bones (plus the tiny ear bones). Eight form the cranium, the vault around the brain. The other fourteen form the face.',
  'It protects the brain and the sense organs of sight, hearing, smell and taste, holds the teeth, and gives the face its shape.',
  ['Most skull bones are locked together by wiggly seams called sutures, which slowly fuse during adulthood.', 'A newborn’s skull has soft spots (fontanelles) that let it squeeze through the birth canal and make room for the fast-growing brain.']);
add('frontal bone',
  'The frontal bone forms your forehead, the ridge above your eyebrows, and the roofs of the eye sockets.',
  'It protects the frontal lobes of the brain and shapes the upper face.',
  ['It contains the frontal sinuses, air pockets that make the skull lighter and help your voice resonate.', 'It starts as two halves at birth that usually fuse within the first two years.']);
add('sinus of frontal bone',
  'The frontal sinus is an air-filled space inside the frontal bone, just above the eyebrows. It is lined with mucous membrane that drains into the nose.',
  'Sinuses lighten the skull, warm and moisten the air you breathe, and add resonance to your voice.',
  ['Frontal sinuses are usually absent at birth and develop through childhood. Their shape is so individual it has been used to identify people from X-rays.']);
add('sinus of sphenoid bone',
  'The sphenoidal sinus is an air space deep inside the sphenoid bone, right in the middle of the head behind the nose.',
  'Like the other sinuses, it lightens the skull and helps humidify the air you breathe.',
  ['The pituitary gland sits just above it, so surgeons can reach the pituitary by going through the nose and this sinus.']);
add('parietal bone',
  'The two parietal bones form the top and upper sides of the skull, like a curved roof.',
  'They protect the upper surface of the brain, including the areas that process touch and body position.',
  ['The name comes from the Latin “paries,” meaning wall.', 'The seam between the left and right parietal bones, the sagittal suture, runs right along the top of your head.']);
add('occipital bone',
  'The occipital bone forms the back and much of the base of the skull.',
  'It protects the back of the brain, where vision is processed, and forms the joint that lets you nod your head on the spine.',
  ['It has a large opening, the foramen magnum (“great hole”), where the spinal cord passes up to meet the brain.', 'The bump you can feel at the back of your head is the external occipital protuberance.']);
add('temporal bone',
  'The temporal bones sit on the sides of the skull, around and behind the ears.',
  'They house the hearing and balance organs and form the socket for the jaw joint.',
  ['Its petrous (“rock-like”) part is the densest bone in the skull and shields the delicate inner ear.', 'The name may come from Latin “tempus” (time), because grey hair often shows first at the temples.']);
add('sphenoid bone',
  'The sphenoid is a butterfly-shaped bone in the middle of the skull base. It touches nearly every other bone of the cranium.',
  'It forms part of the eye sockets and skull floor, and it cradles the pituitary gland in a saddle-shaped pocket called the sella turcica.',
  ['It is often called the keystone of the skull because it links the cranial and facial bones together.', '“Sella turcica” means “Turkish saddle.”']);
add('ethmoid bone',
  'The ethmoid is a light, spongy bone between the eye sockets, behind the bridge of the nose.',
  'It forms part of the nasal cavity and eye sockets. Its sieve-like plate lets the nerves for smell pass from the nose up to the brain.',
  ['“Ethmoid” means sieve-like in Greek. Its cribriform plate is pierced by about 20 tiny holes for smell nerves.']);
add('maxilla',
  'The two maxillae make up the upper jaw, the middle of the face, the floor of the eye sockets and most of the roof of the mouth.',
  'They hold the upper teeth and separate the nose from the mouth.',
  ['Each maxilla contains the largest sinus in the face, the maxillary sinus.', 'A cleft palate happens when the two halves of the palate don’t fully join before birth.']);
add('mandible',
  'The mandible is the lower jaw, the largest and strongest bone of the face and the only skull bone that moves freely.',
  'It holds the lower teeth and swings on the temporomandibular joints so you can bite, chew and talk.',
  ['It starts as two halves that fuse in the middle during the first year of life.', 'The chin is a feature unique to modern humans; no other ape has one.']);
add('zygomatic bone',
  'The zygomatic bone is your cheekbone. It forms the outer side of each eye socket.',
  'It gives the face its width and anchors chewing muscles like the masseter.',
  ['The “bar” you can feel running from your cheek back toward your ear is the zygomatic arch.']);
add('nasal bone',
  'Two small, oblong bones that form the bony bridge of the nose. The rest of the nose is shaped by cartilage.',
  'They support and protect the upper nose.',
  ['The nasal bones are the most commonly broken bones of the face.']);
add('lacrimal bone',
  'The lacrimal bone is a thin, fingernail-sized bone on the inner wall of each eye socket.',
  'It contains a groove for the tear duct, which drains tears from the eye into the nose.',
  ['It is the smallest and most fragile bone of the face.', 'Its drainage path is why your nose runs when you cry.']);
add('palatine bone',
  'An L-shaped bone at the back of the nasal cavity and the roof of the mouth.',
  'It forms the back part of the hard palate and part of the nose and eye-socket walls.',
  ['Run your tongue back along the roof of your mouth: where the hard part ends is the edge of the palatine bones.']);
add('vomer',
  'A thin, flat bone that forms the lower back part of the wall dividing the two nostrils (the nasal septum).',
  'It supports the septum, which splits the airflow into left and right channels.',
  ['“Vomer” is Latin for ploughshare, after its shape.']);
add('inferior nasal concha bone',
  'A thin, scroll-shaped bone curling out from each side wall of the nasal cavity.',
  'The conchae make air swirl as it passes, so it gets warmed, moistened and filtered before reaching the lungs.',
  ['Your nostrils take turns being the more open side every few hours, partly through swelling of the tissue over the conchae.']);
add('hyoid bone',
  'A small U-shaped bone in the front of the neck, above the voice box.',
  'It anchors the tongue and the muscles used to swallow and speak.',
  ['It is the only bone in the body that doesn’t form a joint with another bone. It hangs in place from muscles and ligaments.']);
add(['auditory ossicles', 'malleus'],
  'The malleus (“hammer”) is the first of the three tiny bones of the middle ear. Its handle is attached to the eardrum.',
  'When sound makes the eardrum vibrate, the malleus passes the vibration to the incus and stapes.',
  ['The ear bones and eardrum together boost sound pressure about 20 times before it reaches the fluid-filled inner ear.']);
add('incus',
  'The incus (“anvil”) is the middle of the three ear bones, linking the malleus to the stapes.',
  'It relays and helps amplify vibrations from the eardrum to the inner ear.',
  ['The ear bones are the only bones that are fully adult-sized at birth.']);
add('stapes',
  'The stapes (“stirrup”) is the innermost ear bone, and the smallest bone in the body at about 3 mm long.',
  'Its footplate pushes on the oval window of the inner ear, turning sound into waves in the cochlea’s fluid.',
  ['A tiny muscle, the stapedius, stiffens the stapes to protect your ears from very loud sounds.']);

// ===========================================================================
// TEETH
// ===========================================================================
add(['teeth', 'incisor'],
  'Incisors are the eight flat, chisel-edged front teeth, four on top and four on the bottom.',
  'They slice food when you take a bite.',
  ['Tooth enamel is the hardest substance in the human body.', 'This model shows 28 adult teeth; the third molars (wisdom teeth) aren’t included.']);
add('canine tooth',
  'Canines are the four pointed teeth at the corners of the mouth, one beside each set of incisors.',
  'They grip and tear food.',
  ['Canines have the longest roots of any human tooth.', 'They are sometimes called eye teeth because the upper ones sit right below the eyes.']);
add('premolar',
  'Premolars sit between the canines and molars. Each has two raised points, or cusps.',
  'They crush and tear food as you chew.',
  ['Premolars don’t appear among baby teeth; they come in as adult teeth around ages 10 to 12.']);
add('molar',
  'Molars are the broad teeth at the back of the mouth, with four or five cusps.',
  'Their wide surfaces grind food into small pieces that are easy to swallow and digest.',
  ['The jaw muscles can press the back teeth together with several hundred newtons of force, roughly the weight of an adult.']);

// ===========================================================================
// SPINE
// ===========================================================================
add('vertebral column',
  'The spine is a stack of 33 vertebrae: 7 cervical, 12 thoracic, 5 lumbar, plus the fused sacrum and coccyx. It is cushioned by discs between the bones.',
  'It holds the body upright, lets the trunk bend and twist, and protects the spinal cord running through it.',
  ['Its gentle S-curve works like a spring, absorbing shock when you walk and jump.', 'You are about 1 cm taller in the morning. The discs flatten slightly during the day and re-expand overnight.']);
add('cervical vertebra',
  'The seven cervical vertebrae form the neck. They are the smallest vertebrae, and each has holes in its sides for the arteries that supply the brain.',
  'They support the head and allow the wide range of movement in your neck.',
  ['Almost all mammals, giraffes included, have exactly seven neck vertebrae.']);
add('atlas c1',
  'The atlas is the first vertebra, a ring of bone with no body that holds up the skull.',
  'The joint between the atlas and skull lets you nod “yes.”',
  ['It is named after Atlas, the Titan of Greek myth who held up the heavens.']);
add('axis c2',
  'The axis is the second vertebra. It has a tooth-like peg (the dens) that sticks up through the ring of the atlas.',
  'The atlas pivots around the dens, letting you shake your head “no.”',
  ['About half of all neck rotation happens at this single joint.']);
add('thoracic vertebra',
  'The twelve thoracic vertebrae make up the middle of the back. Each has small flat surfaces where a pair of ribs attach.',
  'They anchor the ribs to form the rib cage and protect the spinal cord.',
  ['Their long spines, angled downward like overlapping roof tiles, limit backward bending in the mid-back.']);
add('lumbar vertebra',
  'The five lumbar vertebrae in the lower back are the largest and strongest vertebrae.',
  'They carry most of the upper body’s weight and allow you to bend forward and backward.',
  ['Most back pain comes from the lumbar region, especially between L4, L5 and the sacrum.']);
add('sacrum',
  'The sacrum is a triangular bone at the base of the spine made of five vertebrae that fuse together in the late teens and twenties.',
  'It joins the spine to the pelvis and passes the weight of the upper body to the legs.',
  ['“Sacrum” means “sacred bone” in Latin, possibly because ancient people saw it as special.']);
add('coccyx',
  'The coccyx, or tailbone, is a small triangle of 3 to 5 tiny fused vertebrae at the very bottom of the spine.',
  'It anchors several pelvic muscles and ligaments and helps support you when you sit leaning back.',
  ['It is the leftover of a tail. Human embryos have a visible tail for a few weeks of development.', 'The name comes from the Greek word for cuckoo, because it looks like a cuckoo’s beak.']);

// ===========================================================================
// THORAX
// ===========================================================================
add(['ribs', 'bones of thorax', 'thoracic skeleton', 'true rib'],
  'True ribs are the first seven pairs. Each one connects directly to the breastbone through its own strip of cartilage.',
  'The ribs form a protective, flexible cage around the heart and lungs and swing up and out each time you breathe in.',
  ['Some people have an extra “cervical rib” above the first rib.', 'Ribs are surprisingly springy. They can bend quite a lot before they break.']);
add('first rib',
  'The first rib is the shortest, flattest and most curved rib, tucked under the collarbone.',
  'It supports the base of the neck and anchors muscles that lift the rib cage when you breathe hard.',
  ['Important vessels and nerves heading to the arm pass right over it.']);
add('false rib',
  'Ribs 8, 9 and 10 are called false ribs. Their cartilage joins the cartilage of the rib above instead of reaching the breastbone directly.',
  'They complete the lower rib cage and give it extra flexibility.');
add('floating rib',
  'Ribs 11 and 12 are floating ribs. They are attached only to the spine at the back, and their front ends are free.',
  'They protect the kidneys and help anchor muscles of the back and abdomen.',
  ['Floating ribs are short and flexible, which makes them less likely to break.']);
add(['costal cartilage', 'costal cartilages'],
  'Costal cartilages are bars of flexible cartilage that link the front ends of the ribs to the breastbone.',
  'They let the rib cage expand and spring back with every breath.',
  ['They often stiffen and partly turn to bone with age, which makes the chest less flexible.']);
add(['sternum', 'body of sternum'],
  'The sternum, or breastbone, is a flat bone in the center of the chest. It has three parts: the manubrium, the body and the xiphoid process.',
  'It anchors the ribs and shields the heart.',
  ['During CPR, chest compressions are done on the lower half of the sternum.', 'It contains red marrow that makes blood cells, even in adults.']);
add('manubrium of sternum',
  'The manubrium is the broad top part of the breastbone. The notch at its top is the dip you can feel at the base of your neck.',
  'It connects to the collarbones and the first two pairs of ribs.',
  ['“Manubrium” is Latin for handle. The whole sternum was compared to a sword, with this part as the hilt.']);
add('xiphoid process',
  'The xiphoid process is the small pointed tip at the bottom of the breastbone.',
  'It anchors some abdominal muscles and the diaphragm.',
  ['It is made of cartilage in young people and slowly turns to bone, often not until around age 40.']);

// ===========================================================================
// UPPER LIMB BONES
// ===========================================================================
add('clavicle',
  'The clavicle, or collarbone, is the S-shaped bone running from the breastbone to the shoulder.',
  'It acts like a strut that holds the shoulder out to the side, so the arm can swing freely.',
  ['It is the most commonly broken bone, often from falling onto an outstretched hand.', 'It is the first bone to begin hardening in a developing baby, around the fifth week of pregnancy.']);
add('scapula',
  'The scapula, or shoulder blade, is a flat triangular bone on the upper back.',
  'Its shallow socket forms the shoulder joint, and it anchors 17 different muscles that move the arm.',
  ['The scapula is connected to the rest of the skeleton only through the collarbone. Muscles hold it against the rib cage and let it glide.']);
add('humerus',
  'The humerus is the long bone of the upper arm, from shoulder to elbow.',
  'It is the lever for the shoulder and elbow muscles that lift, swing and bend the arm.',
  ['The “funny bone” isn’t a bone. It’s the ulnar nerve, which runs over a bump at the bottom of the humerus where it’s easy to knock.']);
add('radius',
  'The radius is the forearm bone on the thumb side.',
  'It rolls around the ulna so you can turn your palm up or down, as when you turn a key or a doorknob.',
  ['A break at the wrist end of the radius is one of the most common fractures, usually from falling onto an outstretched hand.']);
add('ulna',
  'The ulna is the forearm bone on the little-finger side.',
  'It forms the main hinge of the elbow with the humerus and holds the forearm steady while the radius rotates.',
  ['The pointy part of your elbow, the olecranon, is the top of the ulna.']);
add(['carpal bones', 'bones of hand'],
  'The wrist is made of eight small carpal bones arranged in two rows of four.',
  'Together they let the wrist bend and twist while passing force from the hand to the forearm.',
  ['The carpals sit in an arch that forms the floor of the carpal tunnel, where tendons and the median nerve pass into the hand.']);
add('scaphoid bone',
  'The scaphoid is a boat-shaped wrist bone on the thumb side, in the row closest to the forearm.',
  'It links the two rows of wrist bones and takes much of the force when you push with your hand.',
  ['It is the most frequently broken wrist bone. Because its blood supply is poor, it can be slow to heal.']);
add('lunate bone',
  'The lunate is a crescent-moon-shaped wrist bone in the center of the row nearest the forearm.',
  'It forms part of the main wrist joint with the radius.',
  ['“Lunate” comes from Latin “luna,” the moon.']);
add('triquetrum bone',
  'The triquetrum is a pyramid-shaped wrist bone on the little-finger side.',
  'It helps form the wrist joint and supports the pisiform bone.');
add('pisiform bone',
  'The pisiform is a small pea-shaped bone on the palm side of the wrist, below the little finger.',
  'It sits inside a tendon and acts like a pulley, improving the leverage of the muscle that bends the wrist.',
  ['It is the last wrist bone to harden, around age 9 to 12.']);
add('trapezium bone',
  'The trapezium is the wrist bone at the base of the thumb.',
  'Its saddle-shaped joint with the first metacarpal lets your thumb swing across your palm to touch your other fingers.',
  ['This saddle joint gives humans a strong grip and fine precision grip.']);
add('trapezoid bone',
  'The trapezoid is a small wedge-shaped wrist bone next to the trapezium.',
  'It anchors the base of the index finger’s metacarpal.');
add('capitate bone',
  'The capitate is the largest wrist bone, in the very center of the wrist.',
  'It is the keystone of the wrist and lines up with the middle finger’s metacarpal.',
  ['It is usually the first carpal bone to harden after birth.']);
add('hamate bone',
  'The hamate is a wedge-shaped wrist bone on the little-finger side, with a hook sticking out toward the palm.',
  'The hook anchors ligaments and forms one wall of the carpal tunnel.',
  ['The hook of the hamate can break in golfers and baseball players when a club or bat handle presses into the palm.']);
add('metacarpal',
  'The five metacarpals are the long bones inside the palm. Their rounded ends are the knuckles you see when you make a fist.',
  'They form the frame of the palm and connect the wrist to the fingers.',
  ['A break of the 5th metacarpal, at the little finger, is nicknamed a “boxer’s fracture.”']);
add('phalanges of hand',
  'The phalanges are the finger bones: 14 in each hand. The thumb has two and every other finger has three.',
  'They form the fingers, which grip, pinch and point.',
  ['There are no muscles inside your fingers. Long tendons from muscles in the forearm and palm move them like strings on a puppet.']);

// ===========================================================================
// LOWER LIMB BONES
// ===========================================================================
add(['hip bone', 'pelvic girdle', 'bones of pelvic girdle'],
  'Each hip bone forms when three bones fuse during the teenage years: the ilium (the flared top), the ischium (what you sit on) and the pubis (at the front).',
  'The two hip bones and the sacrum form the pelvis. It carries the upper body’s weight to the legs and protects the bladder, bowel and reproductive organs.',
  ['The three bones meet in the hip socket (acetabulum), which is Latin for “vinegar cup.”', 'Pelvis shape differs between the sexes. A wider, rounder pelvic opening makes childbirth possible.']);
add('femur',
  'The femur, or thigh bone, is the longest and strongest bone in the body, about a quarter of your height.',
  'It carries your weight from the hip to the knee and is the lever for the powerful thigh muscles.',
  ['Its angled neck lets the leg swing clear of the pelvis, but it is also where older people most often break a hip.', 'Forensic scientists can estimate a person’s height from the length of the femur alone.']);
add('patella',
  'The patella, or kneecap, is a triangular bone at the front of the knee.',
  'It sits inside the quadriceps tendon and acts like a pulley, giving the thigh muscles more leverage to straighten the knee.',
  ['It is the largest sesamoid bone, a bone that grows inside a tendon.', 'Babies’ kneecaps are soft cartilage. They harden into bone between about ages 3 and 6.']);
add('tibia',
  'The tibia, or shinbone, is the larger of the two lower-leg bones and the second longest bone in the body.',
  'It carries almost all of the body’s weight between the knee and the ankle.',
  ['Its front edge lies just under the skin, which is why knocking your shin hurts so much.']);
add('fibula',
  'The fibula is the thin bone running down the outside of the lower leg.',
  'It carries little weight but anchors muscles and forms the outer knob of the ankle.',
  ['Surgeons sometimes borrow a piece of fibula to rebuild a jaw, because the leg works fine without it.']);
add(['tarsal bones', 'bones of foot'],
  'The seven tarsal bones form the ankle and back half of the foot.',
  'They pass the body’s weight from the leg to the heel and the ball of the foot, and their joints let the foot tilt and adapt to uneven ground.',
  ['Each foot has 26 bones and more than 30 joints.']);
add('talus',
  'The talus is the ankle bone that sits between the shinbone and the heel bone.',
  'It forms the ankle joint and passes your full weight down to the foot.',
  ['No muscles attach to the talus. It is moved entirely by the bones and tendons around it.']);
add('calcaneus',
  'The calcaneus, or heel bone, is the largest bone in the foot.',
  'It takes the impact when your heel strikes the ground, and the calf muscles pull on it through the Achilles tendon to push you forward.',
  ['It is made mostly of spongy bone, which helps absorb shock like a sponge.']);
add('navicular bone',
  'The navicular is a boat-shaped bone on the inner side of the foot, in front of the talus.',
  'It is the keystone of the foot’s inner arch.',
  ['“Navicular” comes from Latin for “little ship.”']);
add('cuboid bone',
  'The cuboid is a cube-shaped bone on the outer side of the foot.',
  'It supports the outer arch and links the heel to the 4th and 5th toes.');
add('cuneiform',
  'The three cuneiform bones are wedge-shaped bones in the middle of the foot.',
  'They help form the transverse arch across the foot and connect to the first three toes.',
  ['“Cuneiform” means wedge-shaped, the same word used for the ancient wedge-shaped writing of Mesopotamia.']);
add('metatarsal',
  'The five metatarsals are the long bones of the front half of the foot. Their heads form the ball of the foot.',
  'They spread your weight across the front of the foot and act as levers when you push off to walk.',
  ['The first metatarsal, behind the big toe, is the thickest because it takes the most force.', 'Stress fractures of the metatarsals are common in runners and soldiers. They are sometimes called “march fractures.”']);
add('phalanges of foot',
  'The toe bones (phalanges) number 14 in each foot. The big toe (hallux) has two and the other toes have three.',
  'The toes help balance and grip, and the big toe gives the final push-off when you walk.',
  ['The big toe takes more of the load than any other toe when you push off to walk.']);
add('sesamoid bones of foot',
  'Two tiny, pea-shaped bones under the ball of the big toe, embedded in a tendon.',
  'They act like pulleys and shock absorbers under the big toe joint.');

// ===========================================================================
// CARTILAGE (nose & larynx)
// ===========================================================================
add(['nasal cartilages', 'nasal septal cartilage', 'major alar cartilage', 'lateral process of nasal septal cartilage'],
  'The flexible lower part of the nose is shaped by plates of cartilage: the septal cartilage in the middle and the alar cartilages around the nostrils.',
  'They keep the nostrils open while letting the tip of the nose bend without breaking.',
  ['Squeeze the tip of your nose: the bendy part is cartilage, and the hard bridge above it is bone.']);
add(['laryngeal cartilages', 'larynx', 'thyroid cartilage'],
  'The thyroid cartilage is the largest cartilage of the voice box (larynx). Its front edge forms the Adam’s apple.',
  'It shields the vocal cords and anchors them at the front.',
  ['It grows larger and more angled in males at puberty, which lengthens the vocal cords and deepens the voice.']);
add('cricoid cartilage',
  'The cricoid is a signet-ring-shaped cartilage at the bottom of the voice box, just above the windpipe.',
  'It is the only complete ring of cartilage around the airway, so it keeps the airway open.',
  ['Doctors use it as a landmark for emergency airway procedures.']);
add(['arytenoid cartilage', 'corniculate cartilage'],
  'The arytenoids are a pair of small pyramid-shaped cartilages at the back of the voice box.',
  'The vocal cords attach to them. Tiny muscles swivel the arytenoids to open the cords for breathing or close them to speak and sing.',
  ['How tightly and quickly these cartilages move the cords sets the pitch of your voice.']);
add('epiglottis',
  'The epiglottis is a leaf-shaped flap of flexible cartilage at the top of the voice box, behind the tongue.',
  'When you swallow, it folds down over the airway so food and drink go into the esophagus instead of the lungs.',
  ['When food “goes down the wrong way,” the epiglottis didn’t close in time, and coughing clears the airway.']);

// ===========================================================================
// JOINTS & LIGAMENTS
// ===========================================================================
add(['ligament', 'joints', 'synovial joint', 'diarthrosis'],
  'Ligaments are tough, slightly stretchy bands of connective tissue that join bone to bone across a joint.',
  'They hold joints together and stop them from moving in the wrong directions.',
  ['Ligaments have a poor blood supply, so a badly sprained ligament can take weeks or months to heal.']);
add(['articular capsule'],
  'A joint capsule is a sleeve of tough tissue wrapped around a movable joint. It is lined with a membrane that makes slippery synovial fluid.',
  'It seals the joint, holds the bones together and keeps the joint lubricated.',
  ['Cracking your knuckles makes a gas bubble form in the synovial fluid inside the joint capsule.']);
add(['intervertebral disc', 'cartilaginous joints of vertebral column', 'intervertebral symphysis', 'nucleus pulposus'],
  'An intervertebral disc is a cushion between two vertebrae. It has a tough outer ring and a soft, jelly-like center called the nucleus pulposus.',
  'Discs absorb shock and let the spine bend and twist.',
  ['A “slipped” or herniated disc happens when the jelly center bulges through the outer ring and presses on a nerve.', 'Discs make up about a quarter of the spine’s length.']);
add(['knee joint'],
  'The knee is the largest joint in the body, where the femur, tibia and kneecap meet. It is held together by four main ligaments and cushioned by two C-shaped menisci.',
  'It works mostly as a hinge, letting you bend and straighten the leg, with a little twisting when bent.',
  ['The knee carries forces several times your body weight when you climb stairs or run.']);
add(['anterior cruciate ligament'],
  'The anterior cruciate ligament (ACL) runs diagonally through the middle of the knee, from the femur to the front of the tibia.',
  'It stops the shinbone from sliding forward and helps control twisting of the knee.',
  ['ACL tears are among the most common serious sports injuries, often from sudden stops or changes of direction.', '“Cruciate” means cross-shaped. The ACL and PCL cross each other like an X.']);
add('posterior cruciate ligament',
  'The posterior cruciate ligament (PCL) crosses the ACL inside the knee and attaches to the back of the tibia.',
  'It stops the shinbone from sliding backward under the femur.',
  ['It is thicker and stronger than the ACL and is injured less often.']);
add(['medial meniscus', 'lateral meniscus'],
  'The menisci are two C-shaped pads of tough cartilage sitting on top of the shinbone inside the knee.',
  'They deepen the joint, spread out the body’s weight and absorb shock.',
  ['A torn meniscus is a common knee injury and can make the knee catch or lock.']);
add(['tibial collateral ligament', 'superficial part of tibial collateral ligament', 'deep part of tibial collateral ligament', 'fibular collateral ligament'],
  'The collateral ligaments run down the inner (tibial) and outer (fibular) sides of the knee.',
  'They stop the knee from buckling sideways.',
  ['The inner one (MCL) is often injured by a blow to the outside of the knee.']);
add(['glenohumeral joint', 'glenoid labrum', 'coracohumeral ligament', 'superior glenohumeral ligament', 'middle glenohumeral ligament', 'inferior glenohumeral ligament', 'transverse humeral ligament'],
  'The shoulder (glenohumeral) joint is a ball-and-socket joint where the head of the humerus meets a shallow socket on the scapula, deepened by a rim of cartilage called the labrum.',
  'It is the most mobile joint in the body. It lets the arm swing in almost any direction.',
  ['Its freedom has a cost: it is the most frequently dislocated major joint.']);
add(['elbow joint', 'annular ligament of radius'],
  'The elbow joins the humerus to both forearm bones. A ring-shaped ligament (the annular ligament) holds the head of the radius in place.',
  'It works as a hinge to bend and straighten the arm and lets the radius spin to turn the palm.',
  ['In toddlers, a sudden pull on the arm can slip the radius out of the annular ligament. This is called “nursemaid’s elbow.”']);
add(['radiocarpal joint', 'intercarpal joints'],
  'The wrist is a cluster of joints between the radius and the eight carpal bones, bound by dozens of small ligaments.',
  'It lets the hand bend up, down and side to side while staying stable enough to push and lift.',
  ['The wrist is one of the most ligament-dense areas of the body.']);
add(['ankle joint', 'anterior talofibular ligament', 'calcaneofibular ligament', 'posterior talofibular ligament'],
  'The ankle is a hinge joint between the tibia, fibula and talus, supported by strong ligaments on the inner and outer sides.',
  'It lets the foot point up and down and keeps it stable when you land.',
  ['The anterior talofibular ligament, on the outside of the ankle, is the most commonly sprained ligament in the body.']);
add(['temporomandibular joint', 'articular disc of temporomandibular joint'],
  'The temporomandibular joint (TMJ) connects the jawbone to the temporal bone, just in front of each ear. A small disc of cartilage sits inside it.',
  'It both hinges and slides, so you can open your mouth wide, chew side to side and speak.',
  ['Put your fingers in front of your ears and open your mouth to feel the jaw slide forward.']);
add(['sacro iliac joint', 'synovial joints of pelvic girdle'],
  'The sacroiliac joints link the sacrum to the two hip bones at the back of the pelvis.',
  'They pass the upper body’s weight into the legs while allowing only a tiny amount of movement.',
  ['During pregnancy, hormones loosen these joints to widen the pelvis for birth.']);
add(['pubic symphysis', 'interpubic disc'],
  'The pubic symphysis is the cartilage joint at the front of the pelvis where the two hip bones meet.',
  'It holds the front of the pelvis together while absorbing some shock when you walk.');
add(['sternoclavicular joint'],
  'The sternoclavicular joint connects the collarbone to the breastbone.',
  'It is the only bony joint linking the whole arm to the trunk.');
add(['acromioclavicular joint'],
  'The acromioclavicular (AC) joint connects the outer end of the collarbone to the top of the shoulder blade.',
  'It lets the shoulder blade tilt and rotate when you raise your arm.',
  ['A “separated shoulder” is an injury to this joint, usually from falling on the point of the shoulder.']);
add(['anterior longitudinal ligament', 'posterior longitudinal ligament', 'fibrous joints of vertebral column', 'ligamenta flava', 'supraspinous ligament', 'interspinous ligaments', 'nuchal ligament'],
  'A set of long ligaments runs the length of the spine, binding the vertebrae and discs together front and back.',
  'They keep the spine stable and stop it from bending too far.',
  ['The ligamenta flava are yellow because they contain lots of elastic fibers, which help pull the spine upright after you bend.']);
add(['interosseous membrane of forearm', 'interosseus membrane of forearm', 'interosseous membrane of leg'],
  'A sheet of tough fibers stretched between the two forearm bones (or the two leg bones).',
  'It binds the bones together, shares forces between them and gives extra surface for muscles to attach.');
add(['sacrotuberous ligament', 'sacrospinous ligament', 'iliolumbar ligament', 'fibrous joints of pelvic girdle'],
  'Strong ligaments that tie the sacrum and lower spine to the hip bones.',
  'They lock the back of the pelvis together and stop the sacrum from tipping forward under the body’s weight.');
add(['plantar aponeurosis', 'long plantar ligament'],
  'The plantar fascia is a thick band of tissue running along the sole from the heel to the toes.',
  'It supports the arch of the foot like the string of a bow and helps spring you forward when you walk.',
  ['Inflammation of this band, plantar fasciitis, is one of the most common causes of heel pain.']);
add(['infrapatellar fat pad'],
  'A soft cushion of fat just behind and below the kneecap.',
  'It fills space inside the knee and cushions the front of the joint as it moves.');
add(['triradiate cartilage'],
  'A Y-shaped plate of growth cartilage in the hip socket where the ilium, ischium and pubis meet.',
  'In children it lets the hip socket grow. It turns to bone in the teenage years when the three hip bones fuse.');


add(['joints of foot', 'intertarsal joints', 'tarsometatarsal joints', 'intermetatarsal joints', 'metatarsophalangeal joints', 'interphalangeal joints of foot'],
  'The foot has more than 30 joints, each tied together by short, strong ligaments on its top and sole.',
  'These ligaments hold the foot’s arches in shape while letting it twist and flex to fit uneven ground.',
  ['The ligaments under the foot act like the tie-rod of a bridge, stopping the arch from flattening when you stand.']);
add(['interphalangeal joints of hand', 'metacarpophalangeal joints', 'carpometacarpal joints', 'intermetacarpal joints'],
  'The joints of the hand link the wrist, palm and finger bones. Each is wrapped in a capsule and braced by collateral ligaments on its sides.',
  'The knuckle joints let the fingers bend, straighten and spread; the finger joints work as simple hinges.',
  ['Each finger has three joints and the thumb has two, giving the hand a huge range of grips.']);
add(['superior tibiofibular joint', 'tibiofibular syndesmosis', 'fibrous joints of free part of lower limb'],
  'The tibia and fibula are joined at the knee end by a small joint and at the ankle end by a tight band of ligaments (a syndesmosis).',
  'These connections keep the two leg bones locked together so the ankle socket stays stable.',
  ['A “high ankle sprain” is an injury to the syndesmosis ligaments just above the ankle.']);
add(['cranial syndesmoses', 'fibrous joints', 'cranial fibrous joints', 'joints of skull'],
  'Fibrous joints are places where bones are bound tightly by fibrous tissue, with little or no movement. The skull’s sutures are examples.',
  'They hold bones firmly together while still allowing a tiny bit of give.');
add(['fibrous joints of larynx', 'thyrohyoid membrane', 'median thyrohyoid ligament', 'lateral thyrohyoid ligament', 'median cricothyroid ligament', 'quadrangular membrane', 'synovial joints of larynx', 'laryngeal joints'],
  'Membranes and small joints link the cartilages of the voice box to each other and to the hyoid bone.',
  'They hold the larynx together and let its cartilages tilt and swivel to change the tension of the vocal cords.',
  ['In an emergency, doctors can open an airway through the cricothyroid membrane, just below the Adam’s apple.']);
add(['costovertebral joints', 'joint of head of rib', 'costotransverse joint', 'synovial joints of thorax', 'fibrous joints of thorax', 'thoracic joints', 'radiate ligament of head of rib', 'costotransverse ligament', 'intra articular ligament of head of rib', 'external intercostal membrane', 'internal intercostal membrane'],
  'Each rib forms two small joints with the spine: one with the vertebral bodies and one with the side of a vertebra.',
  'These joints let the ribs swing up and out like bucket handles when you breathe in.');
add(['fibrous joints of pectoral girdle', 'coracoclavicular ligament', 'trapezoid ligament', 'conoid ligament', 'coraco acromial ligament', 'superior transverse scapular ligament', 'inferior transverse scapular ligament'],
  'Strong ligaments tie the collarbone to the shoulder blade and bridge parts of the scapula.',
  'They hang the shoulder blade from the collarbone and keep the shoulder from dropping.',
  ['The coracoclavicular ligaments (trapezoid and conoid) are torn in severe shoulder separations.']);
add(['synovial joints of free upper limb', 'distal radio ulnar joint', 'articular disc of distal radio ulnar joint'],
  'Joints of the arm, including the shoulder, elbow, the joints between the forearm bones and the wrist.',
  'Together they let you reach, bend, rotate the forearm and position the hand almost anywhere.');
add(['synovial joints of free part of lower limb', 'joints of free part of lower limb', 'joints of lower limb'],
  'The joints of the leg are the hip, knee, ankle and the many small joints of the foot.',
  'They carry the body’s weight while letting you walk, run, squat and balance.');
add(['muscles of neck', 'longus capitis muscle', 'longus cervicis muscle', 'rectus anterior capitis muscle', 'rectus lateralis capitis muscle'],
  'Deep neck muscles lie right against the front of the cervical spine.',
  'They bend the head and neck forward and keep the neck stable.',
  ['Weak deep neck flexors are linked to “text neck” posture from looking down at phones.']);
add(['hypaxial muscles of back', 'serratus posterior inferior muscle', 'serratus posterior superior muscle'],
  'A group of back muscles that sit over the ribs and connect the spine to the ribs and shoulder blades.',
  'They move the shoulder blades and arms, and the serratus posterior muscles help lift and lower the ribs during breathing.');
add(['muscles of thorax', 'subclavius muscle', 'transversus thoracis muscle', 'thoracic part of muscular system'],
  'Muscles that attach to the rib cage and collarbone.',
  'They steady the shoulder girdle and help move the ribs when you breathe.');
add(['levatores costarum', 'levatores longi costarum', 'levatores breves costarum', 'intertransversarii muscles', 'dorsal parts of lateral intertransversarii lumborum muscles', 'ventral parts of lateral intertransversarii lumborum muscles'],
  'Small muscles between the ribs and vertebrae, and between the side projections of the vertebrae.',
  'They lift the ribs slightly and help bend and steady the spine.');
add('pyramidalis muscle',
  'A small triangular muscle at the very bottom of the abdomen, in front of the rectus abdominis.',
  'It tightens the linea alba.',
  ['About 1 in 5 people don’t have one.']);
add(['abdominal part of muscular system', 'pelvic part of muscular system', 'cervical part of muscular system', 'cranial part of muscular system', 'dorsal part of muscular system', 'muscular system of upper limb', 'muscular system of lower limb'],
  'Skeletal muscles attach to bones through tendons and work in opposing pairs to move joints.',
  'Muscles in this region move the body, hold its posture and protect the organs beneath them.');

// ===========================================================================
// MUSCLES — head & neck
// ===========================================================================
add(['facial muscles', 'superficial muscles of head', 'muscles of head'],
  'The facial muscles are thin sheets of muscle just under the skin of the face. Unlike most muscles, many attach to skin rather than bone.',
  'They create facial expressions, and they close the eyes and lips.',
  ['There are around 20 paired facial muscles, enough to make thousands of distinct expressions.']);
add(['frontalis muscle', 'occipitalis muscle', 'epicranius muscle', 'epicranial aponeurosis'],
  'The frontalis muscle covers the forehead and connects over the top of the head to the occipitalis at the back.',
  'It raises your eyebrows and wrinkles your forehead when you look surprised.',
  ['Forehead wrinkles form where the skin creases across the frontalis over years of expression.']);
add(['orbicularis oculi', 'orbital part of orbicularis oculi', 'palpebral part of orbicularis oculi'],
  'A ring of muscle around each eye, inside the eyelids and around the eye socket.',
  'It closes the eyes, gently for blinking or tightly for squinting, and helps spread tears.',
  ['You blink roughly 15 to 20 times a minute, and this muscle does all of it.']);
add('orbicularis oris muscle',
  'A ring of muscle encircling the mouth inside the lips.',
  'It closes and purses the lips for kissing, whistling, drinking through a straw and speaking.');
add(['zygomaticus major muscle', 'zygomaticus minor muscle', 'risorius muscle', 'levator anguli oris'],
  'Strap-like muscles running from the cheekbone and cheek to the corner of the mouth.',
  'They pull the corners of the mouth up and out into a smile.',
  ['A genuine smile also uses the muscles around the eyes. A polite smile often uses only the mouth muscles.']);
add(['bucinator', 'buccinator'],
  'A flat muscle forming the wall of the cheek.',
  'It presses the cheeks against the teeth to keep food between them when you chew, and powers blowing and whistling.',
  ['Its name comes from Latin for “trumpeter.”']);
add(['masticatory muscles', 'masseter', 'superficial part of masseter', 'deep part of masseter'],
  'The masseter is a thick, square muscle running from the cheekbone to the angle of the jaw.',
  'It is the main muscle that closes the jaw for biting and chewing.',
  ['For its size, the masseter is one of the strongest muscles in the body. Clench your teeth and you can feel it bulge.']);
add('temporalis muscle',
  'A fan-shaped muscle covering the side of the skull above the ear, running down to the jaw.',
  'It closes the jaw and pulls it backward.',
  ['Clench your teeth with your fingertips on your temples and you’ll feel it tighten.']);
add(['medial pterygoid muscle', 'lateral pterygoid', 'inferior head of lateral pterygoid muscle', 'superior head of lateral pterygoid muscle'],
  'The pterygoid muscles lie deep inside the jaw, running from the skull base to the mandible.',
  'They move the jaw forward and side to side for grinding food.');
add(['extra ocular muscles', 'lateral rectus muscle', 'medial rectus muscle', 'superior rectus muscle', 'inferior rectus muscle', 'superior oblique muscle', 'inferior oblique muscle', 'common tendinous ring'],
  'Six small muscles attach to each eyeball: four straight “rectus” muscles and two angled “oblique” ones.',
  'They point your eyes precisely and keep both eyes aimed at the same target.',
  ['These are among the fastest-reacting muscles in the body. They move the eyes several times every second as you read.']);
add('levator palpebrae superioris',
  'A thin muscle inside the eye socket that runs into the upper eyelid.',
  'It lifts the upper eyelid and holds the eye open.',
  ['A drooping eyelid (ptosis) can happen when this muscle or its nerve is weak.']);
add(['genioglossus muscle', 'hyoglossus muscle'],
  'These are muscles of the tongue that attach it to the jaw and hyoid bone.',
  'Genioglossus sticks the tongue out; hyoglossus pulls it down and back. Together with the muscles inside the tongue they shape speech and move food.',
  ['Genioglossus keeps the tongue from falling back and blocking the airway while you sleep.']);
add(['sternocleidomastoid muscle', 'sternocleidomastoid'],
  'A long strap muscle on each side of the neck, running from the breastbone and collarbone to behind the ear.',
  'It turns the head to the opposite side and bends the neck forward.',
  ['Turn your head to one side and you can see the opposite sternocleidomastoid stand out as a cord.']);
add('platysma',
  'A very thin, wide sheet of muscle just under the skin of the neck.',
  'It pulls the corners of the mouth down and tenses the skin of the neck.',
  ['Grimace and you can see the platysma make ridges down your neck.']);
add(['scalenus anterior muscle', 'scalenus medius muscle', 'scalenus posterior muscle'],
  'The scalenes are three muscles on the sides of the neck running down to the first two ribs.',
  'They tilt the neck and lift the upper ribs when you breathe hard.',
  ['Nerves to the arm pass between two of the scalenes, so tight scalenes can cause tingling in the hand.']);
add(['suprahyoid muscles', 'infrahyoid muscles', 'digastric muscle', 'mylohyoid muscle', 'stylohyoid muscle', 'geniohyoid muscle', 'omohyoid muscle', 'sternohyoid muscle', 'sternothyroid muscle', 'thyrohyoid muscle'],
  'A group of thin strap muscles above and below the hyoid bone in the front of the neck.',
  'They raise and lower the hyoid and voice box when you swallow and speak, and help open the jaw.',
  ['Put a finger on your Adam’s apple and swallow. You can feel these muscles lift your voice box.']);
add(['pharyngeal muscles', 'superior pharyngeal constrictor', 'middle pharyngeal constrictor', 'inferior pharyngeal constrictor', 'stylopharyngeus muscle', 'palatopharyngeus muscle'],
  'The pharyngeal constrictors are three overlapping, cup-shaped muscles forming the walls of the throat.',
  'They squeeze in sequence to push swallowed food down into the esophagus.',
  ['Swallowing is so automatic that you do it hundreds of times a day, even while asleep.']);
add(['laryngeal muscles'],
  'Tiny muscles inside the voice box that move its cartilages.',
  'They open the vocal cords for breathing and tighten or close them to speak, sing and cough.',
  ['Your vocal cords vibrate around 100–250 times per second while you talk.']);

// ===========================================================================
// MUSCLES — trunk
// ===========================================================================
add(['trapezius', 'trapezius muscle'],
  'The trapezius is a large diamond-shaped muscle covering the upper back and the back of the neck.',
  'It shrugs the shoulders, pulls the shoulder blades together and steadies them while you move your arms.',
  ['Its name comes from its trapezoid shape when you look at the left and right sides together.']);
add('latissimus dorsi muscle',
  'The “lats” are the broadest muscles of the back, sweeping from the lower spine and pelvis up to the upper arm.',
  'They pull the arm down and back, as in swimming, rowing or doing a pull-up.',
  ['“Latissimus dorsi” means “widest of the back.”']);
add(['rhomboid major muscle', 'rhomboid minor muscle'],
  'Two flat, rhombus-shaped muscles between the spine and the shoulder blade, underneath the trapezius.',
  'They squeeze the shoulder blades together and help you stand tall.');
add('levator scapulae',
  'A strap-like muscle on the side and back of the neck, running down to the top corner of the shoulder blade.',
  'It lifts the shoulder blade and tilts the neck to the side.',
  ['It’s a common spot for a “crick” in the neck after sleeping awkwardly.']);
add(['erector spinae', 'epaxial muscles', 'iliocostalis lumborum muscle', 'iliocostalis thoracis muscle', 'iliocostalis colli muscle', 'longissimus thoracis muscle', 'longissimus capitis muscle', 'longissimus colli muscle', 'spinalis capitis muscle', 'spinalis colli muscle', 'spinalis thoracis muscle', 'longissimus muscles', 'spinalis muscles'],
  'The erector spinae are three columns of muscle running up each side of the spine, from the pelvis to the skull.',
  'They hold your back upright, straighten it after you bend over, and lean it to the side.',
  ['These muscles are working almost all the time you are standing or sitting up.']);
add(['transversospinal muscles', 'multifidus muscles', 'multifidus colli muscle', 'multifidus thoracis muscle', 'multifidus lumborum muscle', 'rotatores', 'semispinalis thoracis muscle', 'semispinalis colli muscle', 'interspinales muscles', 'interspinales colli muscles', 'interspinales thoracis muscles', 'interspinales lumborum muscles'],
  'Small, deep muscles that bridge from one vertebra to the next along the spine.',
  'They make tiny adjustments that stabilize each vertebra and help twist the spine.',
  ['The multifidus is thickest in the lower back and is key to back stability.']);
add(['suboccipital muscles', 'rectus posterior major capitis muscle', 'rectus posterior minor capitis muscle', 'obliquus inferior capitis muscle', 'obliquus superior capitis muscle'],
  'Four small muscles tucked under the back of the skull, between it and the top two vertebrae.',
  'They make fine adjustments to the position of your head and help keep your gaze steady.',
  ['They are packed with stretch sensors, which make them key for balance and head position.']);
add(['splenius capitis muscle', 'splenius colli muscle'],
  'Bandage-like muscles at the back of the neck, running from the spine to the skull.',
  'They tilt the head back and turn it to the same side.',
  ['“Splenius” comes from the Greek for bandage.']);
add(['pectoralis major', 'pectoralis major muscle', 'clavicular head of pectoralis major muscle', 'sternocostal head of pectoralis major muscle', 'abdominal part of pectoralis major muscle'],
  'The pectoralis major is the large fan-shaped chest muscle running from the collarbone, breastbone and ribs to the upper arm.',
  'It pulls the arm across the body and forward, as when you push, throw or hug.',
  ['It’s the main muscle worked by push-ups and the bench press.']);
add('pectoralis minor muscle',
  'A thin triangular muscle beneath the pectoralis major.',
  'It pulls the shoulder blade forward and down and helps lift the ribs when you breathe hard.');
add('serratus anterior muscle',
  'A muscle on the side of the rib cage with saw-tooth edges that wrap around to the shoulder blade.',
  'It pulls the shoulder blade forward around the ribs, which you need for punching and reaching.',
  ['It is nicknamed the “boxer’s muscle.” If its nerve is damaged, the shoulder blade sticks out like a wing.']);
add(['intercostal muscles', 'external intercostal muscles', 'internal intercostal muscles', 'innermost intercostal muscles'],
  'The intercostals are three thin layers of muscle filling the spaces between the ribs.',
  'They lift the ribs to help you breathe in and pull them down when you breathe out hard.',
  ['When you laugh hard or cough a lot and your sides ache, that’s often your intercostals.']);
add('diaphragm',
  'The diaphragm is a dome-shaped sheet of muscle that separates the chest from the abdomen.',
  'It is the main muscle of breathing. When it contracts it flattens, pulling air into the lungs.',
  ['Hiccups are sudden involuntary spasms of the diaphragm, with the vocal cords snapping shut to make the “hic.”', 'The diaphragm contracts about 20,000 times a day, without you thinking about it.']);
add(['muscles of abdomen', 'rectus abdominis muscle'],
  'The rectus abdominis is a long, flat pair of muscles running down the front of the abdomen from the ribs to the pubic bone.',
  'It bends the trunk forward, as in a sit-up, and squeezes the abdomen when you cough or strain.',
  ['The “six-pack” shape comes from bands of tendon crossing the muscle. They are visible only when there is little fat over them.']);
add(['external abdominal oblique muscle', 'internal abdominal oblique muscle'],
  'The obliques are two layers of muscle on the sides of the abdomen. Their fibers run diagonally, at right angles to each other.',
  'They twist and bend the trunk sideways and squeeze the belly.',
  ['The outer layer’s fibers run like hands in your front pockets; the inner layer’s run the opposite way.']);
add('transversus abdominis muscle',
  'The deepest abdominal muscle, wrapping around the belly like a corset.',
  'It tightens the abdomen to support the spine and organs, and helps you breathe out forcefully.');
add('quadratus lumborum muscle',
  'A square muscle deep in the lower back, between the lowest rib and the top of the pelvis.',
  'It bends the trunk to the side and steadies the lowest rib when you breathe.',
  ['It is a frequent source of lower back pain.']);
add(['linea alba', 'inguinal ligament'],
  'Tough bands of tendon tissue on the front of the abdomen: the linea alba runs down the midline and the inguinal ligament runs along the groin.',
  'They anchor the abdominal muscles.',
  ['“Linea alba” means “white line.”']);
add(['levator ani', 'pelvic diaphragm', 'iliococcygeus muscle', 'pubococcygeus muscle', 'pubo analis muscle', 'coccygeus muscle', 'tendinous arch of levator ani'],
  'The pelvic floor is a hammock of muscles stretched across the bottom of the pelvis.',
  'It supports the bladder, bowel and reproductive organs and helps control urination and bowel movements.',
  ['Pelvic floor exercises (Kegels) strengthen these muscles.']);
add('external anal sphincter',
  'A ring of skeletal muscle around the anal canal.',
  'It lets you choose when to have a bowel movement.');

// ===========================================================================
// MUSCLES — shoulder & arm
// ===========================================================================
add(['deltoid muscle', 'acromial part of deltoid muscle', 'clavicular part of deltoid muscle', 'scapular spinal part of deltoid muscle', 'deltoid'],
  'The deltoid is the thick, rounded muscle that caps the shoulder.',
  'It lifts the arm out to the side, forward and back.',
  ['It’s named after the Greek letter delta (Δ) because of its triangular shape.', 'It’s a common spot for vaccinations.']);
add(['rotator cuff muscle', 'supraspinatus muscle', 'infraspinatus muscle', 'teres minor muscle', 'subscapularis muscle'],
  'The rotator cuff is four muscles (supraspinatus, infraspinatus, teres minor and subscapularis) that wrap the shoulder joint.',
  'They hold the ball of the humerus in its shallow socket and rotate the arm.',
  ['Rotator cuff tears are common in pitchers, swimmers, and people over 40.', 'A handy mnemonic is SITS: Supraspinatus, Infraspinatus, Teres minor, Subscapularis.']);
add('teres major muscle',
  'A thick muscle running from the bottom corner of the shoulder blade to the upper arm.',
  'It helps the lats pull the arm down and rotate it inward.',
  ['It is sometimes called “lat’s little helper.”']);
add(['biceps brachii', 'biceps brachii muscle', 'long head of biceps brachii', 'short head of biceps brachii'],
  'The biceps is the muscle at the front of the upper arm. It has two heads (that’s what “bi-ceps” means), which join into one belly.',
  'It bends the elbow and turns the palm up, as when you twist a screwdriver or open a jar.',
  ['The biceps is strongest at turning the palm up when the elbow is bent at a right angle.']);
add('brachialis muscle',
  'A broad muscle under the biceps at the front of the lower upper arm.',
  'It is the main elbow-bending muscle, working whatever way your palm faces.',
  ['It does more of the work of bending the elbow than the biceps does.']);
add('coracobrachialis muscle',
  'A small muscle high on the inner arm, running from the shoulder blade to the humerus.',
  'It helps pull the arm forward and toward the body.');
add(['triceps brachii', 'triceps brachii muscle', 'medial head of triceps brachii', 'lateral head of triceps brachii', 'long head of triceps brachii'],
  'The triceps covers the back of the upper arm and has three heads.',
  'It straightens the elbow. It is the opposite partner of the biceps.',
  ['The triceps makes up about two-thirds of the muscle in the upper arm.']);
add(['brachioradialis muscle'],
  'A long muscle on the thumb side of the forearm, from the lower humerus to the wrist.',
  'It bends the elbow, especially when your thumb points up, as when holding a mug.');
add(['anterior compartment of forearm', 'superficial part of anterior compartment of forearm', 'deep part of anterior compartment of forearm', 'flexor carpi radialis', 'flexor carpi ulnaris', 'humeral head of flexor carpi ulnaris', 'ulnar head of flexor carpi ulnaris', 'flexor digitorum superficialis', 'radial head of flexor digitorum superficialis', 'flexor digitorum profundus', 'flexor pollicis longus', 'pronator teres', 'superficial head of pronator teres', 'deep head of pronator teres', 'pronator quadratus'],
  'The front (palm side) of the forearm holds the flexor muscles. Their long tendons run through the wrist into the hand.',
  'They bend the wrist and fingers for gripping, and the pronators turn the palm down.',
  ['Wiggle your fingers and watch your forearm: the muscles moving your fingers are mostly up there, not in your hand.']);
add('palmaris longus muscle',
  'A small, thin muscle in the forearm with a long tendon that runs to the palm.',
  'It helps tense the palm and bend the wrist slightly.',
  ['About 1 in 7 people don’t have one in at least one arm. Press your thumb and little finger together and flex your wrist to see if yours shows.', 'Surgeons often use its tendon for grafts because the body doesn’t miss it.']);
add(['posterior compartment of forearm', 'superficial part of posterior compartment of forearm', 'deep part of posterior compartment of forearm', 'extensor digitorum', 'extensor carpi radialis longus', 'extensor carpi radialis brevis', 'extensor carpi ulnaris', 'ulnar head of extensor carpi ulnaris', 'humeral head of extensor carpi ulnaris', 'extensor digiti minimi', 'extensor indicis', 'extensor pollicis longus', 'extensor pollicis brevis', 'abductor pollicis longus', 'supinator', 'anconeus muscle'],
  'The back of the forearm holds the extensor muscles.',
  'They straighten the wrist and fingers, and the supinator turns the palm up.',
  ['“Tennis elbow” is irritation where these extensor muscles attach to the outside of the elbow.']);
add(['muscles of hand', 'lumbrical muscles of hand', 'dorsal interossei muscles of hand', 'palmar interossei muscles', 'abductor pollicis brevis', 'opponens pollicis muscle', 'superficial head of flexor pollicis brevis', 'deep head of flexor pollicis brevis', 'oblique head of adductor pollicis', 'transverse head of adductor pollicis', 'abductor digiti minimi of hand', 'flexor digiti minimi of hand', 'opponens digiti minimi muscle of hand'],
  'The small muscles inside the hand fill the palm, the fleshy base of the thumb and the spaces between the finger bones.',
  'They make the fine, precise finger and thumb movements needed for writing, typing and picking up small things.',
  ['Opponens pollicis lets the thumb touch each fingertip, one of the movements that make human hands so skilled.']);

// ===========================================================================
// MUSCLES — hip & leg
// ===========================================================================
add(['superficial gluteal muscles', 'gluteus maximus muscle'],
  'The gluteus maximus is the big muscle of the buttock and the largest muscle in the body.',
  'It straightens the hip powerfully when you climb stairs, run, jump or stand up from a chair.',
  ['Its huge size is linked to humans walking and running upright. Other apes have much smaller ones.']);
add(['gluteus medius muscle', 'gluteus minimus muscle'],
  'Fan-shaped muscles on the side of the hip, beneath the gluteus maximus.',
  'They hold the pelvis level every time you stand on one leg, which happens with every step.',
  ['If they are weak, the hip drops on the other side as you walk.']);
add(['deep gluteal muscles', 'piriformis muscle', 'superior gemellus muscle', 'inferior gemellus muscle', 'obturator internus', 'obturator externus', 'quadratus femoris muscle'],
  'A group of small, deep muscles behind the hip joint.',
  'They rotate the thigh outward and hold the ball of the femur in the hip socket.',
  ['The sciatic nerve usually runs just below the piriformis. If it’s tight, it can squeeze the nerve and cause pain down the leg.']);
add(['iliopsoas', 'psoas major', 'iliacus muscle'],
  'The iliopsoas is two muscles, the psoas major (from the lower spine) and the iliacus (from the inside of the pelvis), sharing one tendon to the femur.',
  'It is the strongest muscle for lifting the thigh, which you use when walking, climbing and kicking.',
  ['The psoas is the muscle sold as “tenderloin” or filet mignon in beef.']);
add('tensor fasciae latae',
  'A small muscle on the outer front of the hip that feeds into the iliotibial band.',
  'It helps lift and turn the thigh inward and steadies the knee.');
add('iliotibial tract',
  'The iliotibial (IT) band is a long, thick band of tough tissue running down the outside of the thigh from hip to knee.',
  'It steadies the hip and knee, especially when you run.',
  ['Irritation of the IT band where it crosses the knee is a common running injury.']);
add(['anterior compartment of thigh', 'quadriceps', 'rectus femoris muscle', 'vastus lateralis muscle', 'vastus medialis muscle', 'vastus intermedius muscle'],
  'The quadriceps is four muscles at the front of the thigh: rectus femoris and three vastus muscles. They share one tendon over the kneecap.',
  'They straighten the knee for standing, climbing, jumping and kicking.',
  ['Together they make one of the strongest muscle groups in the body.', 'The vastus lateralis is a common spot for injections in babies.']);
add('sartorius muscle',
  'A long, thin strap running diagonally across the front of the thigh from the hip to the inside of the knee.',
  'It helps bend and rotate the hip and knee, as when you sit cross-legged.',
  ['It is the longest muscle in the body. Its name comes from the Latin for “tailor,” who once sat cross-legged to sew.']);
add(['medial compartment of thigh', 'adductor longus', 'adductor magnus', 'adductor brevis', 'adductor minimus', 'pectineus muscle', 'gracilis muscle'],
  'The adductors are a group of muscles on the inner thigh.',
  'They squeeze the legs together and steady the pelvis while you walk.',
  ['A “groin pull” is usually a strain of one of these muscles.']);
add(['posterior compartment of thigh', 'hamstrings', 'biceps femoris', 'long head of biceps femoris', 'short head of biceps femoris', 'semimembranosus muscle', 'semitendinosus muscle'],
  'The hamstrings are three muscles at the back of the thigh: biceps femoris, semitendinosus and semimembranosus.',
  'They bend the knee and straighten the hip, which is key for running and jumping.',
  ['The name comes from butchers, who hung hams by these tendons.', 'Hamstring strains are among the most common sprinting injuries.']);
add(['anterior compartment of leg', 'tibialis anterior muscle', 'extensor digitorum longus', 'extensor digitorum longus tendon', 'extensor hallucis longus', 'fibularis tertius muscle'],
  'The muscles at the front of the shin, with tibialis anterior the biggest.',
  'They lift the front of the foot and the toes so your toes clear the ground with each step.',
  ['Shin splints often involve overworked muscles in this compartment.']);
add(['fibularis longus muscle', 'fibularis brevis muscle'],
  'The fibularis (peroneal) muscles run down the outer side of the lower leg, with tendons hooking behind the ankle bone.',
  'They turn the sole of the foot outward and help prevent ankle sprains.');
add(['posterior compartment of leg', 'superficial part of posterior compartment of leg', 'gastrocnemius', 'lateral head of gastrocnemius', 'medial head of gastrocnemius'],
  'The gastrocnemius is the two-headed muscle that makes the bulge of the calf.',
  'It rises you onto your toes and pushes off when you walk, run and jump.',
  ['It is made of a lot of fast-twitch fibers, built for powerful bursts like sprinting and jumping.']);
add('soleus muscle',
  'A broad, flat muscle under the gastrocnemius in the calf.',
  'It points the foot down and keeps you from falling forward when you stand.',
  ['It’s nicknamed the “second heart” because its squeezing helps push blood in the leg veins back up to the heart.']);
add('calcaneal tendon',
  'The calcaneal (Achilles) tendon is the thick cord at the back of the ankle connecting the calf muscles to the heel bone.',
  'It transfers the calf’s pull to the heel so you can push off the ground.',
  ['It is the thickest and strongest tendon in the body.', 'It is named after Achilles, the Greek hero whose only weak spot was his heel.']);
add(['deep part of posterior compartment of leg', 'tibialis posterior muscle', 'flexor digitorum longus', 'flexor hallucis longus', 'popliteus muscle', 'plantaris muscle'],
  'The deep calf muscles lie beneath the soleus, with tendons running behind the inner ankle into the sole.',
  'They point the foot, curl the toes and support the arch. Popliteus unlocks the straightened knee.',
  ['Plantaris has a very long, thin tendon and is missing in about 1 in 10 people.']);
add(['muscles of foot', 'abductor hallucis', 'flexor digitorum brevis', 'quadratus plantae muscle', 'extensor digitorum brevis', 'extensor hallucis brevis', 'lumbrical muscles of foot', 'dorsal interossei muscles of foot', 'plantar interossei muscles', 'abductor digiti minimi of foot', 'flexor digiti minimi of foot', 'medial head of flexor hallucis brevis', 'lateral head of flexor hallucis brevis', 'oblique head of adductor hallucis', 'transverse head of adductor hallucis'],
  'The small muscles of the foot, mostly in layers on the sole.',
  'They support the arches and fine-tune the toes for balance and push-off.');
add(['flexor retinaculum of wrist', 'extensor retinaculum of wrist', 'superior extensor retinaculum of ankle', 'inferior extensor retinaculum of ankle', 'superior fibular retinaculum', 'inferior fibular retinaculum', 'flexor retinaculum of ankle', 'lateral patellar retinaculum', 'medial patellar retinaculum'],
  'A retinaculum is a band of thick connective tissue that straps tendons down where they cross a joint.',
  'It keeps tendons in place, like belt loops, so they don’t bowstring when the muscles pull.',
  ['The flexor retinaculum of the wrist forms the roof of the carpal tunnel.']);

// ===========================================================================
// HEART & VESSELS
// ===========================================================================
add('heart',
  'The heart is a fist-sized muscular pump in the middle of the chest, tilted to the left. It has four chambers: two atria on top and two ventricles below.',
  'The right side pumps blood to the lungs to pick up oxygen; the left side pumps oxygen-rich blood to the rest of the body.',
  ['It beats about 100,000 times a day and around 2.5 billion times in a lifetime.', 'Each minute at rest it pumps about 5 liters, roughly all the blood in your body.']);
add('right atrium',
  'The right atrium is the upper right chamber of the heart.',
  'It collects oxygen-poor blood returning from the body through the venae cavae and passes it to the right ventricle.',
  ['Its wall contains the sinoatrial node, the heart’s natural pacemaker, which starts every heartbeat.']);
add('right ventricle',
  'The right ventricle is the lower right chamber of the heart.',
  'It pumps oxygen-poor blood into the pulmonary trunk and on to the lungs.',
  ['Its wall is thinner than the left ventricle’s because it only has to push blood through the lungs next door.']);
add('left atrium',
  'The left atrium is the upper left chamber of the heart.',
  'It receives oxygen-rich blood from the lungs through the pulmonary veins and passes it to the left ventricle.');
add('left ventricle',
  'The left ventricle is the lower left chamber and the strongest part of the heart.',
  'It pumps oxygen-rich blood into the aorta and out to the entire body.',
  ['Its muscular wall is about three times thicker than the right ventricle’s.', 'The pressure it creates is what’s measured as the top number of your blood pressure.']);
add('papillary muscle',
  'Papillary muscles are finger-like muscles on the inner walls of the ventricles, tied to the valve flaps by thin cords called chordae tendineae.',
  'They tighten as the ventricles squeeze, keeping the valves from flipping backward like an umbrella in the wind.',
  ['The cords that tie these muscles to the valves are nicknamed the “heart strings.”']);
add('aortic valve',
  'The aortic valve has three half-moon-shaped flaps (leaflets) at the exit of the left ventricle.',
  'It opens to let blood out into the aorta and snaps shut to stop it flowing back.',
  ['The second sound of your heartbeat (“dub”) is the aortic and pulmonary valves closing.']);
add('pulmonary valve',
  'The pulmonary valve has three half-moon-shaped flaps at the exit of the right ventricle.',
  'It lets blood out into the lungs’ arteries and stops it flowing back.');
add('tricuspid valve',
  'The tricuspid valve has three flaps between the right atrium and right ventricle.',
  'It lets blood into the right ventricle and slams shut when the ventricle squeezes, so blood goes forward to the lungs.',
  ['The first sound of your heartbeat (“lub”) is the tricuspid and mitral valves closing.']);
add('mitral valve',
  'The mitral valve has two flaps between the left atrium and left ventricle.',
  'It lets blood into the left ventricle and closes when the ventricle squeezes, so blood goes out the aorta.',
  ['It’s named after a bishop’s mitre, the two-pointed hat it resembles.']);
add(['valvular complex of heart'],
  'The heart has four one-way valves made of thin, strong flaps of tissue.',
  'They make sure blood flows only one way through the heart.',
  ['The “lub-dub” you hear through a stethoscope is the sound of these valves closing.']);
add(['coronary arteries', 'cardiac vessels', 'arteries of heart'],
  'The coronary arteries wrap around the surface of the heart like a crown (“corona”).',
  'They supply the heart muscle itself with oxygen-rich blood.',
  ['A heart attack happens when one of these arteries gets blocked and part of the heart muscle is starved of oxygen.', 'The left anterior descending artery is sometimes nicknamed the “widow-maker” because blockages there are so dangerous.']);
add(['cardiac veins', 'coronary sinus'],
  'The cardiac veins run alongside the coronary arteries on the heart’s surface and drain into a large vein at the back called the coronary sinus.',
  'They return used blood from the heart muscle to the right atrium.');
add(['aorta', 'thoracic aorta', 'abdominal aorta', 'ascending aorta'],
  'The aorta is the body’s largest artery, about as wide as a garden hose. It rises from the left ventricle, arches over the heart and runs down in front of the spine.',
  'It is the main trunk that carries oxygen-rich blood from the heart to all the arteries of the body.',
  ['Its elastic walls stretch with each heartbeat and spring back, keeping blood moving between beats.']);
add('aortic arch',
  'The aortic arch is the curved part of the aorta that hooks over the top of the heart.',
  'It gives off the three big arteries that supply the head, neck and arms.',
  ['Pressure sensors in its wall constantly report blood pressure to the brain.']);
add(['aortic bifurcation', 'common iliac artery', 'external iliac artery', 'internal iliac artery'],
  'Around the level of the navel, the aorta splits into two common iliac arteries, which divide again to supply the pelvis and legs.',
  'They carry blood to the pelvic organs, buttocks and the legs.');
add(['pulmonary trunk', 'bifurcation of pulmonary trunk', 'pulmonary arteries', 'pulmonary vessels', 'left pulmonary artery', 'right pulmonary artery'],
  'The pulmonary trunk leaves the right ventricle and splits into the right and left pulmonary arteries, which branch through each lung.',
  'They carry oxygen-poor blood from the heart to the lungs to pick up oxygen.',
  ['They are the only arteries in an adult that carry oxygen-poor blood, which is why they are colored blue here.']);
add('pulmonary veins',
  'The pulmonary veins drain each lung, usually four in total, two from each side, into the left atrium.',
  'They bring freshly oxygenated blood from the lungs back to the heart.',
  ['They are the only veins in an adult that carry oxygen-rich blood, which is why they are colored red here.']);
add(['brachiocephalic trunk'],
  'The brachiocephalic trunk is the first and largest branch of the aortic arch.',
  'It splits into the right common carotid artery (to the head) and the right subclavian artery (to the arm).',
  ['There is only one, on the right. On the left those two arteries come straight off the aorta.']);
add(['common carotid artery', 'right common carotid artery', 'left common carotid artery', 'internal carotid artery', 'external carotid artery'],
  'The carotid arteries run up each side of the neck. Each common carotid splits into an internal branch (to the brain) and an external branch (to the face and scalp).',
  'They supply most of the blood to the brain, face and head.',
  ['You can feel your carotid pulse beside your windpipe, just under the angle of your jaw.']);
add(['vertebral artery', 'basilar artery'],
  'The vertebral arteries climb through holes in the neck vertebrae and join inside the skull to form the basilar artery.',
  'They supply the back of the brain, the brainstem and the cerebellum.');
add(['cerebral arterial circle', 'anterior communicating artery', 'posterior communicating artery'],
  'The circle of Willis is a ring of linked arteries at the base of the brain.',
  'It connects the carotid and vertebral blood supplies, so if one artery is narrowed, blood can take a detour.',
  ['Fewer than half of people have a complete, “textbook” circle. Variations are very common.']);
add(['anterior cerebral artery', 'middle cerebral artery', 'posterior cerebral artery'],
  'The three pairs of cerebral arteries branch from the circle of Willis over the surface of the brain.',
  'They supply the cerebral hemispheres: the anterior to the front and middle, the middle to the sides, and the posterior to the back.',
  ['The middle cerebral artery is the vessel most often involved in strokes.']);
add(['subclavian artery', 'right subclavian artery', 'left subclavian artery', 'axillary artery'],
  'The subclavian arteries run under the collarbones and continue into the armpit as the axillary arteries.',
  'They supply the arms, as well as parts of the neck, chest wall and brain.');
add('brachial artery',
  'The brachial artery runs down the inner side of the upper arm to the elbow.',
  'It is the main blood supply of the arm.',
  ['A blood-pressure cuff squeezes this artery, and the doctor listens to it at the elbow.']);
add('radial artery',
  'The radial artery runs down the thumb side of the forearm.',
  'It supplies the forearm and hand.',
  ['It’s where you usually feel your pulse at the wrist.']);
add('ulnar artery',
  'The ulnar artery runs down the little-finger side of the forearm.',
  'It supplies the forearm and joins the radial artery in loops across the palm.');
add(['superficial palmar arch', 'deep palmar arch'],
  'Two loops of artery in the palm, formed by the radial and ulnar arteries joining.',
  'They feed the arteries to each finger, so the hand has two backup routes for blood.');
add(['internal thoracic artery'],
  'The internal thoracic artery runs down inside the front of the chest wall, beside the breastbone.',
  'It supplies the chest wall and breasts.',
  ['Heart surgeons often reroute it to bypass a blocked coronary artery.']);
add(['coeliac trunk', 'celiac trunk', 'splenic artery', 'left gastric artery', 'common hepatic artery', 'proper hepatic artery', 'gastroduodenal artery'],
  'The celiac trunk is a short, thick branch from the abdominal aorta that splits into three arteries.',
  'It supplies the stomach, liver, gallbladder, spleen and part of the pancreas and duodenum.');
add(['superior mesenteric artery', 'inferior mesenteric artery', 'ileocolic artery', 'right colic artery', 'left colic artery', 'sigmoid arteries', 'marginal artery', 'appendicular artery'],
  'The mesenteric arteries fan out from the aorta through the folds of tissue (mesentery) that hold the intestines.',
  'They supply the small intestine and the large intestine.');
add(['renal artery', 'right renal artery', 'left renal artery', 'intrarenal arteries of right kidney', 'intrarenal arteries of left kidney'],
  'The renal arteries branch from the aorta to each kidney.',
  'They bring blood to the kidneys to be filtered.',
  ['The kidneys receive about a fifth of all the blood the heart pumps.']);
add(['femoral artery', 'deep femoral artery'],
  'The femoral artery is the main artery of the thigh, continuing from the external iliac artery in the groin.',
  'It supplies the leg.',
  ['You can feel its pulse in the crease of the groin.', 'Doctors often thread catheters through it to reach the heart.']);
add('popliteal artery',
  'The popliteal artery runs behind the knee.',
  'It carries blood from the thigh to the lower leg and foot.');
add(['anterior tibial artery', 'posterior tibial artery', 'fibular artery'],
  'The three main arteries of the lower leg.',
  'They supply the muscles of the leg and the foot.',
  ['The posterior tibial pulse can be felt just behind the inner ankle bone.']);
add('dorsalis pedis artery',
  'The dorsalis pedis artery runs over the top of the foot.',
  'It supplies the top of the foot and toes.',
  ['Doctors check its pulse on top of the foot to make sure blood is reaching the feet.']);
add(['superior vena cava'],
  'The superior vena cava is a large vein that empties into the right atrium from above.',
  'It returns oxygen-poor blood from the head, neck, arms and chest to the heart.');
add(['inferior vena cava', 'inferior vena cava th', 'inferior vena cava ab'],
  'The inferior vena cava is the largest vein in the body. It runs up beside the aorta into the right atrium.',
  'It returns blood from the legs, pelvis and abdomen to the heart.',
  ['Its walls are thin and stretchy, so it can hold a lot of blood at low pressure.']);
add(['internal jugular vein', 'external jugular vein', 'anterior jugular vein'],
  'The jugular veins run down the neck.',
  'They drain blood from the brain, face and neck back toward the heart.',
  ['The external jugular vein can bulge on the side of the neck when you strain, sing or shout.']);
add(['brachiocephalic vein', 'right brachiocephalic vein', 'left brachiocephalic vein'],
  'The two brachiocephalic veins form where the jugular and subclavian veins meet, and they join to make the superior vena cava.',
  'They gather blood from the head, neck and arms.');
add(['subclavian vein', 'left subclavian vein', 'right subclavian vein', 'axillary vein'],
  'The subclavian veins run under the collarbones from the armpits.',
  'They carry blood from the arms back toward the heart.',
  ['They are a common site for central IV lines, which deliver medicines straight into a large vein.']);
add(['cephalic vein', 'basilic vein', 'median cubital vein', 'median antebrachial vein', 'dorsal venous network of hand'],
  'The superficial veins of the arm lie just under the skin. You can often see them on the back of your hand and inside your elbow.',
  'They drain blood from the skin and tissues of the arm.',
  ['The median cubital vein, inside the elbow, is the most common spot for drawing blood.']);
add(['great saphenous vein'],
  'The great saphenous vein runs just under the skin from the inner ankle all the way up to the groin.',
  'It drains blood from the foot, leg and thigh.',
  ['It is the longest vein in the body.', 'Surgeons often harvest it to use as a bypass for blocked heart arteries.']);
add(['small saphenous vein'],
  'A superficial vein running up the back of the calf to behind the knee.',
  'It drains the outer foot and the back of the leg.');
add(['femoral vein', 'popliteal vein', 'anterior tibial veins', 'posterior tibial veins', 'fibular veins', 'deep femoral vein'],
  'The deep veins of the leg run alongside the arteries, inside the muscles.',
  'They carry most of the blood from the legs back up to the heart, helped by the squeezing of the calf muscles.',
  ['Sitting still for a long time, as on a long flight, can let a clot form in these veins (a deep vein thrombosis).']);
add(['hepatic portal vein', 'superior mesenteric vein', 'inferior mesenteric vein', 'splenic vein', 'tributaries of hepatic portal vein'],
  'The hepatic portal vein collects blood from the stomach, intestines, spleen and pancreas and carries it to the liver.',
  'It sends nutrient-rich blood from digestion straight to the liver to be processed and cleaned before it reaches the rest of the body.',
  ['About three-quarters of the liver’s blood supply arrives through this vein, not through an artery.']);
add(['hepatic veins'],
  'Short, wide veins that leave the back of the liver.',
  'They drain blood from the liver into the inferior vena cava.');
add(['renal vein', 'right renal vein', 'left renal vein', 'intrarenal veins of right kidney', 'intrarenal veins of left kidney'],
  'The renal veins carry blood out of each kidney into the inferior vena cava.',
  'They return filtered blood to circulation.',
  ['The left renal vein is longer than the right because it must cross in front of the aorta.']);
add(['azygos vein', 'hemi azygos vein', 'accessory hemi azygos vein'],
  'The azygos veins run up the back of the chest beside the spine.',
  'They drain the chest wall and back and provide a detour route to the heart if the vena cava is blocked.',
  ['“Azygos” means “unpaired” in Greek. There’s only one, on the right side.']);
add(['dural venous sinuses', 'cranial veins', 'superior sagittal sinus', 'inferior sagittal sinus', 'straight sinus', 'transverse sinus', 'sigmoid sinus', 'cavernous sinus', 'confluence of sinuses', 'dural venous sinus'],
  'Dural venous sinuses are channels between layers of the tough membrane (dura) lining the skull.',
  'They collect blood and used cerebrospinal fluid from the brain and drain it into the internal jugular veins.',
  ['Unlike normal veins, their walls are rigid and they have no valves.']);
add(['artery', 'arteries'],
  'Arteries are thick-walled, muscular vessels that carry blood away from the heart.',
  'They deliver oxygen-rich blood under high pressure to every tissue in the body.',
  ['The pulse you feel at your wrist or neck is a pressure wave traveling along the arteries with each heartbeat.']);
add(['vein', 'veins'],
  'Veins are thin-walled vessels that carry blood back to the heart. Many have one-way valves inside.',
  'They return used blood from the tissues to the heart under low pressure.',
  ['At any moment, about two-thirds of your blood is in your veins.', 'Muscles squeezing the veins as you move help push blood back up toward the heart.']);

// ===========================================================================
// RESPIRATORY
// ===========================================================================
add(['respiratory system', 'lungs', 'lung', 'right lung', 'left lung'],
  'The lungs are two spongy, cone-shaped organs filling most of the chest. The right lung has three lobes; the left has two, leaving room for the heart.',
  'They bring air into close contact with blood so oxygen can pass in and carbon dioxide can pass out.',
  ['The lungs contain roughly 300–500 million tiny air sacs (alveoli). Spread flat, their surface would cover about 50–75 square meters, the floor of a small apartment.', 'The left lung is a little smaller than the right because the heart leans to the left.']);
add(['superior lobe of left lung', 'inferior lobe of left lung', 'superior lobe of right lung', 'middle lobe of right lung', 'inferior lobe of right lung'],
  'Each lung is divided into lobes by deep grooves: three lobes on the right and two on the left.',
  'Each lobe has its own branch of the airway and its own blood vessels, so it works almost like a mini-lung.',
  ['A surgeon can remove a whole diseased lobe and leave the others working.', 'The left lung has a notch, the cardiac notch, where the heart sits.']);
add('trachea',
  'The trachea, or windpipe, is a tube about 10–12 cm long running from the voice box down into the chest. It is held open by about 16–20 C-shaped rings of cartilage.',
  'It carries air to and from the lungs. Its lining traps dust and sweeps it up and out with tiny hairs.',
  ['The open side of each C-ring faces the esophagus, so a big swallow of food can bulge into it.']);
add(['tracheobronchial tree', 'bronchi', 'left main bronchus', 'right main bronchus'],
  'The bronchi are the branching airways inside the lungs. The windpipe splits into left and right main bronchi, which divide again and again into smaller tubes.',
  'They carry air deep into every part of the lungs.',
  ['The airways branch about 23 times from windpipe to air sac, like an upside-down tree.', 'The right main bronchus is wider and more vertical, so inhaled objects more often end up in the right lung.']);

// ===========================================================================
// DIGESTIVE
// ===========================================================================
add('digestive system',
  'The digestive system is a muscular tube several meters long from mouth to anus, plus helper organs like the liver, gallbladder and pancreas.',
  'It breaks food down into nutrients small enough to be absorbed into the blood, and gets rid of what’s left.',
  ['A meal typically takes about one to three days to travel all the way through.']);
add('tongue',
  'The tongue is a mass of muscle covered in a moist lining with taste buds.',
  'It moves food while you chew, pushes it back to swallow, senses taste and shapes the sounds of speech.',
  ['You have roughly 2,000–8,000 taste buds, and they are replaced about every two weeks.', 'It is built from eight muscles: four inside it that change its shape, and four that anchor it and move it around.']);
add(['soft palate', 'uvula of palate', 'palate'],
  'The soft palate is the muscular back part of the roof of the mouth. The uvula is the small finger of tissue hanging from it.',
  'When you swallow, the soft palate lifts to seal off the nose so food doesn’t go up into it.',
  ['Vibration of the soft palate and uvula is a common cause of snoring.']);
add('gingiva',
  'The gingiva, or gums, is the pink tissue covering the jawbones around the teeth.',
  'It seals the teeth into the jaw and protects their roots from germs.',
  ['Healthy gums are firm and pink. Bleeding when you brush is often an early sign of gum disease.']);
add(['major salivary glands', 'salivary glands', 'parotid gland', 'accessory parotid gland', 'submandibular gland', 'sublingual gland', 'parotid duct', 'submandibular duct'],
  'There are three pairs of major salivary glands: the parotid (in front of the ears), the submandibular (under the jaw) and the sublingual (under the tongue).',
  'They make saliva, which moistens food, starts digesting starch and helps protect your teeth.',
  ['You make about 1 to 1.5 liters of saliva a day.', 'Mumps is a viral infection that swells the parotid glands.']);
add(['pharynx', 'fauces'],
  'The pharynx, or throat, is a muscular tube behind the nose and mouth.',
  'It is a shared passage for both air and food, leading to the windpipe and the esophagus.');
add(['oesophagus', 'esophagus'],
  'The esophagus is a muscular tube about 25 cm long that runs from the throat, behind the windpipe and heart, down to the stomach.',
  'It pushes swallowed food to the stomach with waves of muscle contraction called peristalsis.',
  ['Thanks to peristalsis you can swallow even while upside down.', 'Heartburn happens when stomach acid splashes back up into the esophagus.']);
add('stomach',
  'The stomach is a J-shaped, stretchy muscular bag in the upper left abdomen.',
  'It stores food, churns it and mixes it with acid and enzymes, turning it into a soupy mix called chyme.',
  ['Stomach acid is strong enough to dissolve some metals. A layer of mucus keeps it from digesting the stomach itself.', 'An empty stomach holds less than a cup, but it can stretch to hold more than a liter.']);
add(['small intestine', 'duodenum', 'jejunum', 'ileum'],
  'The small intestine is a coiled tube about 3 to 6 meters long, made up of the duodenum, the jejunum and the ileum. In this model it appears as one coiled mass.',
  'It finishes digesting food and absorbs most nutrients into the blood.',
  ['Folds, finger-like villi and microscopic microvilli together multiply its absorbing surface by around 600 times.', 'The duodenum is named from Latin for “twelve fingers wide,” its approximate length.']);
add(['large intestine', 'colon', 'ascending colon', 'transverse colon', 'descending colon', 'sigmoid colon', 'mesocolon'],
  'The colon is the main part of the large intestine, about 1.5 meters long. It rises on the right, crosses the abdomen and descends on the left.',
  'It absorbs water and salts from what’s left of food, turning it into solid waste.',
  ['It is home to trillions of bacteria that make vitamins and help train the immune system.']);
add(['taeniae coli', 'free taenia', 'mesocolic taenia', 'omental taenia'],
  'The taeniae coli are three narrow ribbons of muscle running along the length of the colon.',
  'They are shorter than the colon itself, so they bunch it into pouches (haustra).');
add('vermiform appendix',
  'The appendix is a narrow, finger-shaped pouch about 8–10 cm long attached to the start of the large intestine.',
  'It contains immune tissue and may store helpful gut bacteria that can repopulate the colon after illness.',
  ['Appendicitis, an inflamed appendix, is one of the most common reasons for emergency surgery.', '“Vermiform” means worm-shaped.']);
add(['liver'],
  'The liver is the largest internal organ, weighing about 1.5 kg. It sits in the upper right abdomen under the ribs.',
  'It performs hundreds of jobs: it makes bile to digest fat, stores sugar and vitamins, removes toxins and alcohol, and makes proteins that help blood clot.',
  ['It is the only internal organ that can regrow. Even after two-thirds is removed, it can grow back to nearly full size within weeks to months.', 'At any moment it holds about a tenth of the body’s blood.']);
add('gallbladder',
  'The gallbladder is a small, pear-shaped sac tucked under the liver.',
  'It stores and concentrates bile from the liver and squeezes it into the intestine when you eat fatty food.',
  ['Bile can crystallize into gallstones. Some are as small as sand; others are as big as a golf ball.', 'People can live normally without a gallbladder.']);
add(['bile duct', 'extrahepatic bile ducts'],
  'The bile duct carries bile from the liver and gallbladder into the duodenum.',
  'It delivers bile to the intestine to help break down fats.');
add(['pancreas', 'pancreatic duct', 'accessory pancreatic duct'],
  'The pancreas is a long, soft gland lying behind the stomach.',
  'It makes digestive enzymes that flow through its duct into the intestine, and it releases the hormones insulin and glucagon to control blood sugar.',
  ['In type 1 diabetes, the immune system destroys the pancreas’s insulin-making cells.']);
add(['peritoneum', 'peritoneal structures', 'greater omentum', 'lesser omentum'],
  'The peritoneum is a thin, slippery membrane lining the abdomen. The greater omentum is a fatty apron of it hanging down in front of the intestines.',
  'It lets the organs slide smoothly, holds them in place and helps contain infections.',
  ['The omentum is nicknamed the “abdominal policeman” because it moves to wall off areas of infection.']);

// ===========================================================================
// URINARY
// ===========================================================================
add(['urinary system', 'kidney'],
  'The kidneys are two bean-shaped organs, each about the size of a fist, against the back wall of the abdomen.',
  'They filter the blood, removing waste and extra water as urine, and they help control blood pressure and red blood cell production.',
  ['Each kidney contains about a million tiny filters called nephrons.', 'Your kidneys filter about 180 liters of fluid out of the blood every day, then reabsorb all but 1–2 liters, which becomes urine.']);
add('renal pelvis',
  'The renal pelvis is a funnel-shaped space in the center of each kidney.',
  'It collects urine from the kidney and funnels it into the ureter.');
add('ureter',
  'The ureters are two narrow tubes, each about 25–30 cm long, running from the kidneys down to the bladder.',
  'They carry urine to the bladder using waves of muscle contraction.',
  ['Kidney stones are most painful when they get stuck in a ureter.']);
add('urinary bladder',
  'The bladder is a hollow, stretchy muscular bag in the lower pelvis.',
  'It stores urine until you are ready to empty it.',
  ['A typical adult bladder holds about 400–600 mL. You usually feel the urge to go when it’s about half full.']);
add('urethra',
  'The urethra is the tube that carries urine from the bladder out of the body.',
  'In males it also carries semen.',
  ['It is about 4 cm long in females and about 20 cm in males.']);

// ===========================================================================
// ENDOCRINE & LYMPHOID
// ===========================================================================
add(['endocrine glands', 'thyroid gland'],
  'The thyroid is a butterfly-shaped gland in the front of the neck, wrapped around the windpipe below the Adam’s apple.',
  'It makes hormones that set your metabolism, the speed at which your body uses energy, and affect heart rate and growth.',
  ['It needs iodine to make its hormones, which is why iodine is added to table salt.']);
add('parathyroid gland',
  'Four tiny glands, each about the size of a grain of rice, on the back of the thyroid.',
  'They control the level of calcium in the blood, which nerves and muscles need to work.');
add(['suprarenal gland', 'adrenal gland'],
  'The adrenal (suprarenal) glands are small triangular glands sitting on top of each kidney.',
  'They release adrenaline for the “fight or flight” response, plus cortisol and other hormones that control stress, salt balance and blood pressure.',
  ['Adrenaline can raise your heart rate within seconds of a scare.']);
add(['hypophysis', 'hyposphysis', 'adenohypophysis', 'neurohypophysis', 'pituitary gland'],
  'The pituitary gland is a pea-sized gland hanging from the bottom of the brain, sitting in a pocket of the sphenoid bone.',
  'It is often called the “master gland” because its hormones control the thyroid, adrenal glands, growth, and reproduction.',
  ['It has two parts: the front (adenohypophysis) makes hormones, while the back (neurohypophysis) stores hormones made by the brain.']);
add('pineal gland',
  'The pineal gland is a tiny pine-cone-shaped gland deep in the middle of the brain.',
  'It releases melatonin, a hormone that helps control your sleep–wake cycle.',
  ['It makes most of its melatonin in the dark, which is why screens at night can make it harder to fall asleep.']);
add(['lymphoid organs', 'primary lymphoid organs', 'thymus'],
  'The thymus is a soft gland in the upper chest behind the breastbone.',
  'It trains white blood cells called T cells to recognize germs without attacking the body’s own tissues.',
  ['It is largest during childhood and slowly turns to fat after puberty.']);
add(['secondary lymphoid organs', 'spleen'],
  'The spleen is a fist-sized organ in the upper left abdomen, tucked behind the stomach under the ribs.',
  'It filters the blood, removes old red blood cells and helps fight certain infections.',
  ['You can live without a spleen, though you become more vulnerable to some infections.', 'It is fragile and can be injured in contact sports, which is why people with an enlarged spleen avoid them.']);

// ===========================================================================
// REPRODUCTIVE (male, as modeled)
// ===========================================================================
add(['genital systems', 'male genital system', 'male internal genitalia', 'testis'],
  'The testes are two oval glands held in the scrotum, outside the body.',
  'They make sperm and the hormone testosterone.',
  ['They sit outside the body because sperm develop best a few degrees cooler than core body temperature.']);
add('epididymis',
  'A tightly coiled tube, about 6 meters long if unwound, on the back of each testis.',
  'It stores sperm while they mature and learn to swim.');
add(['ductus deferens', 'ejaculatory duct'],
  'The ductus (vas) deferens is a muscular tube that carries sperm from the epididymis up into the pelvis.',
  'It transports sperm toward the urethra.',
  ['A vasectomy cuts or seals these tubes.']);
add(['seminal gland', 'prostate'],
  'The seminal glands and the walnut-sized prostate sit below the bladder.',
  'They add fluids to semen that nourish and protect sperm.',
  ['The prostate wraps around the urethra, so when it enlarges with age it can make urination harder.']);
add(['penis', 'male external genitalia', 'glans penis', 'corpus cavernosum of penis', 'corpus spongiosum of penis'],
  'The penis contains three columns of spongy tissue that can fill with blood.',
  'It carries urine and semen out of the body through the urethra.');

// ===========================================================================
// BRAIN & SPINAL CORD
// ===========================================================================
add(['brain', 'cerebrum', 'telencephalon', 'cerebral hemisphere'],
  'The cerebrum is the largest part of the brain, split into left and right hemispheres. Its wrinkled outer layer, the cortex, is folded into ridges (gyri) and grooves (sulci).',
  'It handles thinking, memory, language, voluntary movement and the senses.',
  ['The folds let a large sheet of cortex, about the area of a pillowcase, fit inside the skull.', 'The brain is about 2% of body weight but uses about 20% of the body’s energy.']);
add('frontal lobe',
  'The frontal lobe is the front part of each hemisphere, behind the forehead. It is the largest lobe.',
  'It plans, makes decisions, controls impulses and personality, produces speech (Broca’s area) and starts voluntary movement (the motor cortex).',
  ['The frontal lobes are the last part of the brain to fully mature, in the mid-twenties.']);
add('precentral gyrus',
  'The precentral gyrus is the ridge just in front of the central sulcus. It is the primary motor cortex.',
  'Every voluntary movement starts here. Each section controls a different body part.',
  ['The hands and face get much more motor cortex than the back or legs, which is why they move so precisely.']);
add(['opercular part of inferior frontal gyrus', 'triangular part of inferior frontal gyrus'],
  'This part of the inferior frontal gyrus is Broca’s area, usually in the left hemisphere.',
  'It is essential for producing speech and putting words together into sentences.',
  ['It is named after Paul Broca, who in 1861 linked damage here to the loss of the ability to speak.']);
add('parietal lobe',
  'The parietal lobe sits on top of each hemisphere, behind the frontal lobe.',
  'It processes touch, temperature and pain, and it helps you understand where your body is in space.',
  ['Damage here can cause people to ignore one side of their world entirely, a condition called hemispatial neglect.']);
add('postcentral gyrus',
  'The postcentral gyrus is the ridge just behind the central sulcus. It is the primary somatosensory cortex.',
  'It receives touch, pressure, temperature and pain signals from every part of the body.',
  ['A map of the body stretches across it. The lips and fingertips get the biggest areas, which is why they are so sensitive.']);
add('temporal lobe',
  'The temporal lobe lies on the side of each hemisphere, behind the temples and above the ears.',
  'It processes sound, helps you understand language (Wernicke’s area), recognize faces and form memories.',
  ['Deep inside it are the hippocampus and amygdala, key for memory and emotion.']);
add(['superior temporal gyrus', 'superior temporal gyrus lateral part', 'transverse temporal gyri', 'temporal plane'],
  'The top ridge of the temporal lobe, including the primary auditory cortex (the transverse gyri) and, at the back, Wernicke’s area.',
  'It processes sounds and helps you understand spoken language.',
  ['The transverse temporal gyri are often called Heschl’s gyri, after the anatomist who described them.']);
add('occipital lobe',
  'The occipital lobe is at the back of each hemisphere.',
  'It is the brain’s main visual center, processing color, shape and movement.',
  ['Seeing “stars” after a bump on the back of the head comes from jolting this lobe.']);
add(['calcarine sulcus', 'cuneus', 'lingual gyrus', 'occipital pole'],
  'The area around the calcarine sulcus at the back of the brain is the primary visual cortex.',
  'It is the first stop in the cortex for signals from the eyes.',
  ['The left visual cortex sees the right half of the world, and the right sees the left.']);
add(['limbic lobe', 'cingulate gyrus'],
  'The limbic lobe is a ring of cortex on the inner surface of each hemisphere, wrapping around the corpus callosum.',
  'It helps link emotions, motivation and memory.');
add(['insula', 'insula subcentral gyrus and ant and post sulci', 'circular sulcus of insula'],
  'The insula is a fold of cortex hidden deep inside the lateral sulcus.',
  'It senses the inner state of the body (heartbeat, hunger, pain) and helps with emotions like disgust and empathy.');
add(['interlobar sulci', 'central sulcus', 'parieto occipital sulcus', 'lateral sulcus'],
  'Sulci are the deep grooves between the brain’s ridges. Major sulci divide the cerebrum into lobes.',
  'The central sulcus separates movement (in front) from touch (behind); the lateral sulcus separates the temporal lobe; the parieto-occipital sulcus marks the occipital lobe.');
add(['corpus callosum'],
  'The corpus callosum is a thick, curved band of about 200 million nerve fibers deep in the middle of the brain.',
  'It connects the left and right hemispheres so they can share information.',
  ['In rare cases surgeons cut it to stop severe seizures. Studies of these “split-brain” patients revealed how differently the two halves work.']);
add(['white matter of telencephalon', 'white matter', 'anterior commissure', 'hippocampal commissure', 'fornix', 'stria terminalis'],
  'White matter is made of nerve fibers wrapped in fatty insulation (myelin), which makes it look white.',
  'It wires different parts of the brain together so signals can travel quickly between them.',
  ['The fornix is an arch of fibers that carries memory signals from the hippocampus.']);
add(['hippocampus'],
  'The hippocampus is a curved structure deep inside each temporal lobe.',
  'It is crucial for forming new memories and for finding your way around.',
  ['“Hippocampus” means seahorse in Greek, after its curled shape.', 'London taxi drivers, who memorize thousands of streets, have been found to have a larger rear hippocampus.']);
add(['amygdaloid body', 'amygdala'],
  'The amygdala is an almond-shaped cluster of neurons deep in each temporal lobe, in front of the hippocampus.',
  'It processes emotions, especially fear, and helps tag memories with emotional importance.',
  ['It reacts to a threat before you are even consciously aware of it.']);
add(['corpus striatum', 'dorsal striatum', 'caudate nucleus', 'putamen', 'globus pallidus', 'lentiform nucleus', 'basal ganglia'],
  'The basal ganglia are clusters of neurons deep in the brain, including the caudate nucleus, putamen and globus pallidus.',
  'They help start and smooth out movements and are involved in habits and rewards.',
  ['Parkinson’s disease is caused by the loss of cells that send signals to the basal ganglia.']);
add(['diencephalon', 'thalamus'],
  'The thalamus is a pair of egg-shaped masses in the center of the brain.',
  'It is the brain’s relay station. Nearly all sensory signals except smell pass through it on their way to the cortex.',
  ['It also helps control sleep, alertness and consciousness.']);
add(['hypothalamus', 'mamillary body'],
  'The hypothalamus is a small region below the thalamus, about the size of an almond.',
  'It controls body temperature, hunger, thirst, sleep and the pituitary gland, linking the nervous system to hormones.',
  ['It works like a thermostat, triggering sweating or shivering to keep you near 37 °C.']);
add(['lateral ventricle', 'third ventricle', 'fourth ventricle', 'aqueduct of midbrain cerebral aqueduct', 'central canal', 'septum pellucidum'],
  'The ventricles are connected spaces inside the brain filled with cerebrospinal fluid (CSF).',
  'They make CSF, which cushions the brain and spinal cord and carries away waste.',
  ['Your body makes about half a liter of CSF a day and replaces it several times over.', 'The brain floats in CSF, so its effective weight drops from about 1.4 kg to around 25–50 g.']);
add(['optic chiasm', 'optic tract', 'lateral geniculate body'],
  'The optic chiasm is where the optic nerves from the two eyes meet and partly cross, just under the brain.',
  'It sends signals from the left half of what each eye sees to the right brain, and from the right half to the left brain.');
add(['cerebellum', 'superior cerebellar peduncle'],
  'The cerebellum (“little brain”) sits at the back of the skull, beneath the cerebrum.',
  'It coordinates movement, balance and posture, and it fine-tunes skills like writing or riding a bike.',
  ['It is only about a tenth of the brain’s volume but contains more than half of its neurons.']);
add(['brainstem', 'midbrain'],
  'The brainstem connects the brain to the spinal cord. It has three parts: the midbrain, pons and medulla oblongata.',
  'It controls automatic functions like breathing, heart rate, swallowing and sleep, and it carries all signals between brain and body.',
  ['Ten of the twelve pairs of cranial nerves arise from the brainstem.']);
add(['superior colliculus', 'inferior colliculus', 'tectum of midbrain'],
  'The colliculi are four small bumps on the back of the midbrain.',
  'The superior pair helps you turn your eyes and head toward something you see; the inferior pair does the same for sounds.');
add('pons',
  'The pons is the bulging middle part of the brainstem.',
  'It relays signals between the cerebrum and cerebellum and helps control breathing rhythm and sleep.',
  ['“Pons” is Latin for bridge.']);
add(['medulla oblongata', 'pyramid of medulla oblongata', 'olive'],
  'The medulla oblongata is the lowest part of the brainstem, just above the spinal cord.',
  'It runs vital automatic functions: breathing, heart rate, blood pressure, coughing and swallowing.',
  ['In the medulla’s pyramids, most movement pathways cross over. That is why the left brain controls the right side of the body.']);
add(['grey matter of medulla oblongata', 'grey matter of pontine tegmentum', 'cranial nerve nucleus', 'red nucleus'],
  'These are clusters of nerve cell bodies (nuclei) in the brainstem.',
  'Many are the start or end points of cranial nerves, handling things like eye movement, facial expression, hearing, swallowing and heart rate.');
add(['spinal cord', 'grey matter of spinal cord', 'anterior horn of spinal cord'],
  'The spinal cord is a cable of nerve tissue about 45 cm long running down from the brain inside the spine.',
  'It carries messages between the brain and body and handles quick reflexes on its own.',
  ['It ends around the first or second lumbar vertebra; below that, nerve roots continue like a horse’s tail (the cauda equina).']);
add(['meninges', 'dura', 'spinal dura', 'cranial dura', 'falx cerebri', 'tentorium cerebelli', 'arachnoid', 'pia', 'choroid plexus'],
  'The meninges are three protective membranes around the brain and spinal cord: the tough dura mater, the web-like arachnoid and the delicate pia mater.',
  'They protect the nervous system and hold the cerebrospinal fluid that cushions it.',
  ['“Dura mater” means “tough mother” in Latin.', 'Meningitis is an infection of these membranes.']);

// ===========================================================================
// CRANIAL & PERIPHERAL NERVES
// ===========================================================================
add(['cranial nerves'],
  'There are 12 pairs of cranial nerves, which come straight out of the brain rather than the spinal cord. They are numbered with Roman numerals from front to back.',
  'They control the senses of the head (smell, sight, taste, hearing, balance), the muscles of the face, eyes, tongue and throat, and many internal organs.');
add('olfactory nerve i',
  'Cranial nerve I, the olfactory nerve, is made of tiny fibers that pass from the roof of the nose up through the ethmoid bone.',
  'It carries the sense of smell.',
  ['Smell is closely tied to memory and emotion because its signals go almost directly to the brain’s memory and emotion areas.']);
add('optic nerve ii',
  'Cranial nerve II, the optic nerve, runs from the back of each eye to the brain. It has about a million nerve fibers.',
  'It carries visual information from the retina to the brain.',
  ['Where it leaves the eye there are no light sensors, so each eye has a blind spot. The brain fills it in.']);
add(['oculomotor nerve iii', 'trochlear nerve iv', 'abducens nerve vi'],
  'Cranial nerves III, IV and VI travel to the muscles that move the eye.',
  'Together they aim the eyes. III also lifts the eyelid and narrows the pupil.',
  ['The trochlear nerve is the thinnest cranial nerve and has the longest path inside the skull.']);
add(['trigeminal nerve v', 'sensory root of trigeminal nerve', 'motor root of trigeminal nerve', 'ophtalmic nerve', 'ophthalmic nerve', 'maxillary nerve', 'mandibular nerve', 'inferior alveolar nerve', 'lingual nerve', 'mental nerve', 'buccal nerve'],
  'Cranial nerve V, the trigeminal, splits into three big branches that cover the forehead, cheek and jaw.',
  'It carries touch and pain from the face, teeth and mouth, and it controls the chewing muscles.',
  ['Dentists numb the inferior alveolar branch to work on lower teeth, which is why your lip and chin go numb too.']);
add(['facial nerve vii', 'chorda tympani'],
  'Cranial nerve VII, the facial nerve, travels through the temporal bone and fans out across the face.',
  'It controls the muscles of facial expression, carries taste from the front of the tongue and controls tear and saliva glands.',
  ['Bell’s palsy, a sudden weakness on one side of the face, is caused by inflammation of this nerve.']);
add(['vestibulocochlear nerve viii', 'vestibular nerve', 'cochlear nerve'],
  'Cranial nerve VIII has two parts: the cochlear nerve (hearing) and the vestibular nerve (balance).',
  'It carries sound and balance information from the inner ear to the brainstem.');
add('glossopharyngeal nerve ix',
  'Cranial nerve IX supplies the tongue and throat.',
  'It carries taste from the back of the tongue and sensation from the throat, and it helps you swallow.',
  ['It triggers your gag reflex.']);
add('vagus nerve x',
  'Cranial nerve X, the vagus nerve, is the longest cranial nerve. It wanders from the brainstem down through the neck and chest into the abdomen.',
  'It slows the heart, controls digestion and helps you swallow and speak.',
  ['“Vagus” is Latin for wandering.', 'It carries a lot of “gut feelings” from the intestines up to the brain.']);
add('accessory nerve xi',
  'Cranial nerve XI supplies two large neck and shoulder muscles.',
  'It controls the sternocleidomastoid and trapezius, letting you turn your head and shrug.');
add(['hypoglossal nerve xii', 'hyppoglossal nerve xii'],
  'Cranial nerve XII runs under the tongue.',
  'It controls the tongue’s muscles for speaking, chewing and swallowing.',
  ['If it is damaged on one side, the tongue points toward that side when stuck out.']);
add(['spinal nerves'],
  'There are 31 pairs of spinal nerves. Each leaves the spinal cord between two vertebrae.',
  'They carry signals to and from the skin, muscles and organs of the neck, trunk and limbs.',
  ['Each spinal nerve supplies a strip of skin called a dermatome. Doctors map them to find nerve damage.']);
add(['brachial plexus', 'roots of brachial plexus', 'supraclavicular part of brachial plexus', 'infraclavicular part of brachial plexus', 'superior trunk of brachial plexus', 'middle trunk of brachial plexus', 'inferior trunk of brachial plexus', 'posterior cord of brachial plexus'],
  'The brachial plexus is a network of nerves formed by the lower neck and first chest spinal nerves. They join, split and rejoin in the neck and armpit.',
  'It sorts the nerve fibers into the five main nerves that control the shoulder, arm and hand.',
  ['A “stinger” or “burner” in contact sports is a brief stretch injury to this plexus.']);
add(['median nerve', 'common palmar digital branches of median nerve', 'proper palmar digital branches of median nerve', 'anterior interosseous nerve of forearm', 'palmar branch of median nerve', 'muscular branches of median nerve'],
  'The median nerve runs down the middle of the arm and through the carpal tunnel at the wrist into the hand.',
  'It controls most forearm muscles that bend the wrist and fingers and the muscles of the thumb, and carries feeling from the thumb side of the palm.',
  ['Carpal tunnel syndrome happens when this nerve is squeezed at the wrist, causing tingling in the thumb and fingers.']);
add(['ulnar nerve', 'dorsal branch of ulnar nerve', 'superficial branch of ulnar nerve', 'deep branch of ulnar nerve', 'palmar branch of ulnar nerve', 'common palmar digital branches of ulnar nerve', 'proper palmar digital branches of ulnar nerve', 'muscular branches of ulnar nerve'],
  'The ulnar nerve runs down the inner arm, behind the elbow, and along the little-finger side of the forearm into the hand.',
  'It controls most of the small muscles of the hand and carries feeling from the little finger and half of the ring finger.',
  ['Hitting your “funny bone” is actually hitting this nerve where it lies unprotected behind the elbow.']);
add(['radial nerve', 'deep branch of radial nerve', 'superficial branch of radial nerve', 'posterior interosseous nerve of forearm', 'dorsal digital branches of radial nerve', 'muscular branches of radial nerve', 'posterior antebrachial cutaneous nerve', 'inferior lateral brachial cutaneous nerve'],
  'The radial nerve spirals around the back of the humerus and runs down the outer forearm.',
  'It controls the muscles that straighten the elbow, wrist and fingers.',
  ['Falling asleep with an arm over a chair back can squeeze this nerve and cause “wrist drop,” nicknamed “Saturday night palsy.”']);
add(['musculocutaneous nerve', 'lateral antebrachial cutaneous nerve'],
  'The musculocutaneous nerve passes through the front of the upper arm.',
  'It controls the biceps, brachialis and coracobrachialis, and carries feeling from the outer forearm.');
add(['axillary nerve', 'superior lateral brachial cutaneous nerve', 'muscular branches of axillary nerve'],
  'The axillary nerve wraps around the back of the upper humerus, just below the shoulder joint.',
  'It controls the deltoid and teres minor and carries feeling from the skin over the shoulder.',
  ['It can be damaged when the shoulder dislocates.']);
add(['long thoracic nerve'],
  'A long nerve running down the side of the chest wall.',
  'It controls the serratus anterior, which holds the shoulder blade against the ribs.',
  ['Injury to it causes a “winged scapula,” where the shoulder blade sticks out.']);
add(['intercostal nerves', 'thoracic nerves'],
  'The intercostal nerves run in the spaces between the ribs.',
  'They control the intercostal muscles and carry feeling from the chest and abdominal wall.',
  ['Shingles often follows the path of one intercostal nerve, making a stripe-shaped rash around the trunk.']);
add(['lumbar plexus', 'lumbosacral plexus', 'iliohypogastric nerve', 'ilio inguinal nerve', 'genitofemoral nerve', 'lateral femoral cutaneous nerve', 'obturator nerve'],
  'The lumbar plexus is a network of nerves formed from the lower back spinal nerves, inside the psoas muscle.',
  'It supplies the lower abdominal wall, groin and the front and inner thigh.');
add(['femoral nerve', 'anterior cutaneous branches of femoral nerve'],
  'The femoral nerve is the largest branch of the lumbar plexus. It enters the thigh in the groin beside the femoral artery.',
  'It controls the quadriceps and carries feeling from the front of the thigh.');
add(['saphenous nerve', 'infrapatellar branch of saphenous nerve', 'medial crural cutaneous branches of saphenous nerve'],
  'The saphenous nerve is the longest branch of the femoral nerve. It runs all the way down the inner leg to the foot.',
  'It carries feeling from the inner side of the knee, leg and foot.');
add(['sacral plexus', 'sciatic nerve'],
  'The sciatic nerve is the largest and longest nerve in the body. It is about as thick as your thumb where it leaves the pelvis and runs down the back of the thigh.',
  'It controls the hamstrings and all the muscles below the knee, and carries feeling from most of the leg and foot.',
  ['“Sciatica” is pain shooting down the leg when this nerve or its roots are pinched, often by a disc in the lower back.']);
add(['tibial nerve', 'medial plantar nerve', 'lateral plantar nerve', 'medial sural cutaneous nerve', 'sural nerve'],
  'The tibial nerve is one of the two main branches of the sciatic nerve. It runs down the back of the leg and into the sole.',
  'It controls the calf muscles and the muscles of the sole, and carries feeling from the sole of the foot.',
  ['The sural nerve, a skin branch, is the nerve most often sampled for nerve biopsies.']);
add(['common fibular nerve', 'superficial fibular nerve', 'deep fibular nerve'],
  'The common fibular (peroneal) nerve wraps around the outside of the leg just below the knee, close under the skin.',
  'It controls the muscles that lift the foot and toes and turn the foot outward.',
  ['Because it is so exposed, crossing your legs for a long time can squeeze it and make your foot “fall asleep.”']);
add(['autonomic division of peripheral nervous system', 'sympathetic trunk', 'sympathetic nerves', 'ganglia of sympathetic trunk'],
  'The sympathetic trunk is a chain of nerve clusters (ganglia) running down each side of the spine.',
  'It is part of the autonomic nervous system, which drives the “fight or flight” response: faster heartbeat, wider pupils, slower digestion.',
  ['These changes happen automatically. You can’t consciously switch them on or off.']);

// ===========================================================================
// SENSE ORGANS
// ===========================================================================
add(['sense organs', 'eye', 'eyeball', 'anterior segment of eyeball', 'posterior segment of eyeball'],
  'The eyeball is a ball about 2.4 cm across. It has a tough white outer coat, a clear front window, a focusing lens and a light-sensitive layer at the back.',
  'It focuses light into an image on the retina, which turns it into nerve signals for the brain.',
  ['The image on your retina is upside down. The brain flips it.', 'A newborn’s eyes are already about three-quarters of their adult size, which is one reason babies’ eyes look so big.']);
add('cornea',
  'The cornea is the clear, dome-shaped window at the front of the eye.',
  'It does most of the eye’s focusing, bending light as it enters.',
  ['It has no blood vessels; it gets oxygen straight from the air and from tears.', 'Corneal transplants are among the most common transplant operations.']);
add('sclera',
  'The sclera is the tough white outer coat of the eyeball.',
  'It protects the eye and keeps its shape. The eye muscles attach to it.',
  ['Humans have more visible white sclera than other primates, which may help us see where others are looking.']);
add('iris',
  'The iris is the colored ring of muscle at the front of the eye, with the pupil as the hole in the middle.',
  'It widens or narrows the pupil to control how much light gets in.',
  ['The pattern of your iris is unique, more distinctive than a fingerprint, so it can be used for ID scans.']);
add(['lens', 'zonular fibres', 'suspensory ligament of eyeball'],
  'The lens is a clear, flexible disc behind the iris, held in place by fine fibers.',
  'It fine-tunes focus by changing shape, rounder for near things and flatter for far things.',
  ['The lens stiffens with age, which is why many people need reading glasses after about 45.', 'A cataract is a lens that has turned cloudy.']);
add('retina',
  'The retina is a thin layer of light-sensing cells lining the back of the eye.',
  'Its rods (for dim light) and cones (for color and detail) turn light into nerve signals.',
  ['Each retina has about 120 million rods and 6 million cones.']);
add(['vitreous body', 'anterior chamber of eyeball'],
  'The eye is filled with clear fluids: a watery liquid at the front and a jelly called the vitreous body behind the lens.',
  'They keep the eyeball round and let light pass through to the retina.',
  ['“Floaters” are tiny clumps in the vitreous that cast shadows on the retina.']);
add(['lacrimal apparatus', 'accessory visual structures', 'lacrimal gland', 'lacrimal canaliculus', 'ampulla of lacrimal canaliculus', 'lacrimal sac', 'nasolacrimal duct'],
  'The lacrimal apparatus is the tear system: a gland above the outer eye that makes tears, and small ducts at the inner corner that drain them into the nose.',
  'Tears keep the eye moist, wash away dust and contain substances that kill germs.',
  ['When you cry, the drains overflow and tears spill down your cheeks.']);
add(['ear', 'external ear', 'tympanic membrane'],
  'The tympanic membrane, or eardrum, is a thin, cone-shaped membrane at the end of the ear canal.',
  'It vibrates when sound waves hit it and passes those vibrations to the ear bones.',
  ['It is only about 0.1 mm thick but can detect vibrations smaller than the width of an atom.']);
add(['internal ear', 'cochlea'],
  'The cochlea is a snail-shaped, fluid-filled tube in the inner ear, about the size of a pea.',
  'It turns sound vibrations into nerve signals. Different spots along it respond to different pitches.',
  ['It contains about 15,000 tiny hair cells. Once damaged by loud noise, they don’t grow back.']);
add(['vestibule', 'semicircular canals'],
  'The vestibule and semicircular canals are the balance organs of the inner ear.',
  'They sense head tilt, acceleration and spinning, and tell the brain which way is up.',
  ['Dizziness after spinning happens because the fluid in the canals keeps moving after you stop.']);

// ===========================================================================
// SKIN REGIONS
// ===========================================================================
add(['umbilicus', 'umbilical region'],
  'The umbilicus, or belly button, is the scar left where the umbilical cord was attached before birth.',
  'Before birth, the cord carried nutrients and oxygen from the mother.',
  ['Roughly 90% of people have an “innie.”', 'Belly buttons host a whole ecosystem of bacteria.']);
add(['nail plate', 'nail plate foot', 'peryonix', 'peryonix foot', 'nail'],
  'Nails are hard plates of keratin, the same protein as hair, growing from a root under the skin fold at their base.',
  'They protect the fingertips and toes and help you pick up small objects and scratch.',
  ['Fingernails grow about 3 mm a month, roughly two to three times faster than toenails.']);
add(['auricular region', 'helix', 'antihelix', 'tragus', 'antitragus', 'lobule of auricle', 'concha of auricle', 'scapha', 'triangular fossa'],
  'The auricle (pinna) is the visible outer ear, a curved flap of skin over flexible cartilage, except for the soft earlobe.',
  'Its folds collect sound and funnel it into the ear canal, and help you tell whether a sound is in front, behind, above or below.',
  ['The earlobe has no cartilage, just fat and skin.']);
add(['eyebrow'],
  'The eyebrows are arches of thick, short hairs over the brow ridge.',
  'They keep sweat and rain out of your eyes and are important for facial expression.',
  ['Eyebrows are surprisingly important for recognizing faces, possibly even more than the eyes.']);
add(['palm', 'palmar surface of digits of hand', 'sole', 'plantar surfaces of digits of foot'],
  'The skin of the palms and soles is thick and hairless, with ridges that form fingerprints and footprints.',
  'The ridges improve grip, and the many nerve endings make these areas very sensitive.',
  ['Fingerprint patterns form before birth and stay the same for life. Even identical twins have different ones.']);
add(['popliteal fossa'],
  'The popliteal fossa is the hollow at the back of the knee.',
  'Important vessels and nerves pass through it on the way to the lower leg.',
  ['Doctors can sometimes feel the popliteal pulse deep in this hollow.']);
add(['cubital fossa', 'anterior region of elbow'],
  'The cubital fossa is the soft hollow on the inside of the elbow.',
  'Large veins lie just under the skin here, and the brachial artery runs deeper.',
  ['It is the most common spot for blood tests.']);
add(['philtrum'],
  'The philtrum is the vertical groove between the nose and the upper lip.',
  'It forms where the parts of the face join before birth.',
  ['Nobody is sure it has a function today. It’s a leftover of how the face develops.']);
add(['triangle of auscultation'],
  'A small triangle on the back between the trapezius, latissimus dorsi and shoulder blade, where the muscle layer is thin.',
  'Doctors can hear breathing sounds especially clearly here with a stethoscope.');
add(['regions of head', 'regions of face'],
  'This patch of skin covers part of the head or face.',
  'Facial skin is thin and packed with nerve endings and small muscles that pull on it to make expressions.');


// ===========================================================================
// FEMALE REPRODUCTIVE SYSTEM & BREAST
// ===========================================================================
add(['female genital system', 'female internal genitalia', 'genital systems'],
  'The female reproductive system includes the ovaries, uterine (fallopian) tubes, uterus, vagina and the external genitalia (vulva).',
  'It makes eggs and the hormones estrogen and progesterone, provides a place where a fertilized egg can develop into a baby, and forms the birth canal.',
  ['A baby girl is born with all the eggs she will ever have, about 1 to 2 million. Only around 400 will be released during her life.', 'The uterus can grow from the size of a pear to the size of a watermelon during pregnancy.']);
add(['uterus'],
  'The uterus (womb) is a hollow, pear-shaped muscular organ in the pelvis, about 7–8 cm long, tilted forward over the bladder.',
  'Each month its lining thickens to receive a fertilized egg. In pregnancy it holds and nourishes the growing baby, and its powerful muscle contracts to push the baby out during birth.',
  ['Its muscle wall (myometrium) contains some of the strongest muscle in the body for its size.', 'The uterus tilts forward in most people; this is called anteversion.']);
add(['cervix of uterus', 'cervix'],
  'The cervix is the narrow lower part of the uterus that opens into the vagina.',
  'It lets menstrual blood out and sperm in, makes mucus that changes through the menstrual cycle, and widens (dilates) up to about 10 cm during childbirth.',
  ['Regular cervical screening (Pap or HPV tests) checks for early changes that could lead to cancer.']);
add(['endometrium'],
  'The endometrium is the inner lining of the uterus.',
  'It thickens each cycle to prepare for a possible pregnancy, and is shed as a period if no fertilized egg implants.',
  ['The endometrium regrows completely every month, one of the fastest-growing tissues in the adult body.']);
add(['ovary'],
  'The ovaries are two almond-sized glands on either side of the uterus.',
  'They hold and mature eggs and release one roughly every month (ovulation). They also make the hormones estrogen and progesterone.',
  ['Each egg grows inside a fluid-filled sac called a follicle. You can see their bumps on the surface in this model.', 'The human egg is one of the largest cells in the body, just visible to the naked eye at about 0.1 mm.']);
add(['uterine tube'],
  'The uterine (fallopian) tubes are two narrow tubes, about 10–12 cm long, that run from the top corners of the uterus toward the ovaries.',
  'Finger-like fimbriae at the open end sweep the released egg into the tube, where fertilization usually happens. Tiny hairs and muscle waves move the egg toward the uterus.',
  ['Their open ends are not attached to the ovaries; the fimbriae “catch” the egg.', 'The tubes are named after Gabriele Falloppio, a 16th-century Italian anatomist.']);
add(['vagina'],
  'The vagina is a stretchy, muscular canal about 7–9 cm long that runs from the cervix to the outside of the body.',
  'It is the birth canal, the passage for menstrual flow, and receives the penis during sex.',
  ['Its walls are folded into ridges (rugae) that let it stretch enormously during childbirth.']);
add(['clitoris', 'glans of clitoris', 'body and crura of clitoris'],
  'The clitoris is much larger than the small visible tip (glans). Its body and two long “legs” (crura) extend inside along the pubic bones.',
  'It is the main organ of sexual pleasure and is packed with sensory nerve endings.',
  ['The full internal shape of the clitoris was only accurately described in 1998, using MRI scans.']);
add(['bulb of vestibule'],
  'The vestibular bulbs are two elongated masses of spongy, blood-filled tissue on either side of the vaginal opening.',
  'They fill with blood during arousal, like the spongy tissue of the clitoris.');
add(['greater vestibular gland'],
  'The greater vestibular (Bartholin’s) glands are two pea-sized glands beside the vaginal opening.',
  'They release a small amount of fluid that keeps the vulva moist.');
add(['labium minus', 'labia'],
  'The labia minora are two thin folds of skin inside the labia majora, surrounding the vestibule.',
  'They protect the openings of the urethra and vagina. Their size and shape vary widely between people.');
add(['pudendal region female', 'female external genitalia', 'vulva'],
  'The vulva is the external female genitalia: the mons pubis, the labia majora and minora, the clitoris and the vestibule.',
  'It protects the openings of the vagina and urethra and contains sensitive tissue involved in sexual response.');
add(['female urethra'],
  'The female urethra is a short tube, about 4 cm long, from the bladder to an opening just in front of the vagina.',
  'It carries urine out of the body.',
  ['Because it is so short, bacteria can reach the bladder more easily, which is why urinary tract infections are more common in females.']);
add(['ligament of ovary', 'suspensory ligament of ovary', 'round ligament of uterus', 'broad ligament of uterus'],
  'Several ligaments hold the uterus and ovaries in place: the ovarian ligament ties each ovary to the uterus, the suspensory ligament carries its blood vessels from the pelvic wall, and the round ligament runs forward to the groin.',
  'They keep the organs positioned while letting the uterus grow during pregnancy.',
  ['Stretching of the round ligaments causes a common sharp groin pain in pregnancy.']);
add(['ovarian artery', 'ovarian vein'],
  'The ovarian arteries branch from the aorta high in the abdomen and travel down to the ovaries; the ovarian veins return blood the same way.',
  'They supply and drain the ovaries and part of the uterine tubes.',
  ['They start near the kidneys because the ovaries first form high in the abdomen before moving down into the pelvis.']);
add(['uterine artery'],
  'The uterine artery branches from the internal iliac artery and climbs the side of the uterus in a coiled, corkscrew path.',
  'It supplies the uterus. The coils straighten out as the uterus grows in pregnancy.');
add(['breast', 'breast adipose tissue'],
  'The breast is mostly fat (adipose tissue) surrounding the milk-producing glands, sitting on the chest muscle over ribs 2 to 6.',
  'After childbirth, the mammary glands produce milk to feed a baby. The amount of fat, not gland tissue, mainly decides breast size.',
  ['Breast tissue extends into the armpit in a “tail” of tissue, which is why breast checks include the armpit.']);
add(['mammary gland lobes', 'mammary gland'],
  'Each breast contains about 15–20 lobes of glandular tissue arranged like the spokes of a wheel around the nipple.',
  'The lobes contain clusters of tiny sacs (alveoli) that make milk when breastfeeding.');
add(['lactiferous ducts'],
  'Lactiferous ducts are milk ducts that run from each lobe to the nipple, widening into small reservoirs just behind it.',
  'They carry milk from the glands to openings on the nipple.');
add(['nipple'],
  'The nipple is the raised tip of the breast, surrounded by the darker skin of the areola.',
  'In females it is where milk ducts open; small glands in the areola keep the skin moist.');

// ===========================================================================
// LYMPHATIC SYSTEM
// ===========================================================================
add(['lymphoid organs', 'lymph nodes', 'lymph node'],
  'Lymph nodes are small bean-shaped filters, usually 2 mm to 2 cm across, placed along lymph vessels. There are roughly 600 of them, clustered in the neck, armpits, chest, abdomen and groin.',
  'They filter lymph (fluid drained from tissues) and are where immune cells meet germs and start fighting them.',
  ['“Swollen glands” in your neck during a cold are lymph nodes working hard.']);
add(['palatine tonsil', 'pharyngeal lymphoid ring'],
  'The palatine tonsils are two lumps of lymph tissue at the back of the throat, part of a ring of immune tissue around the throat.',
  'They sample germs that enter through the mouth and nose and help train the immune system.',
  ['They are largest in childhood and often shrink in adulthood.']);
add(['bursa'],
  'A bursa is a small fluid-filled sac that cushions places where tendons or muscles slide over bone.',
  'It reduces friction so joints move smoothly.',
  ['Bursitis is painful inflammation of a bursa, common in the shoulder, elbow and knee.']);

// ===========================================================================
// Name clean-up, aliases and lookup
// ===========================================================================
const FIX = [
  [/\b2d\b/g, '2nd'], [/\b3d\b/g, '3rd'], [/\bHeighth\b/g, 'Eighth'], [/Hyppoglossal/g, 'Hypoglossal'], [/Ophtalmic|Ophtalmic/g, 'Ophthalmic'],
  [/ophtalmic/g, 'ophthalmic'], [/Occiptal/g, 'Occipital'], [/calcaneonavivular/g, 'calcaneonavicular'], [/broncus/g, 'bronchus'],
  [/[Ii]nterosseus/g, (m) => m[0] + 'nterosseous'], [/Peryonix/g, 'Nail fold'], [/Hyposphysis/g, 'Hypophysis'], [/tibitalar/g, 'tibiotalar'],
  [/^Lat Fis-ant-Horizont$/, 'Lateral sulcus (anterior horizontal branch)'], [/^Lat Fis-ant-Vertical$/, 'Lateral sulcus (anterior ascending branch)'],
  [/^Lat Fis-post$/, 'Lateral sulcus (posterior branch)'], [/^Sulcus interm prim-Jensen$/, 'Intermediate sulcus of Jensen'],
  [/^Inferior vena cava-th$/, 'Inferior vena cava (thoracic part)'], [/^Inferior vena cava-ab$/, 'Inferior vena cava (abdominal part)'],
  [/^Nucleus pulposus-(.+)$/, 'Nucleus pulposus ($1)'], [/^Intervertebral symphysis-Sacrum-Coccyx$/, 'Sacrococcygeal joint'],
  [/-tendon$/, ' tendon'], [/\s*\(\/\/.*\)$/, ''], [/^Oesophagus$/, 'Esophagus'], [/^Eye'$/, 'Eye'], [/\.$/, ''],
  [/Lateral malleola$/, 'Lateral malleolus region'], [/Medial malleola$/, 'Medial malleolus region'], [/Cymba conchae/, 'Cymba of concha'],
  [/Coeliac/, 'Celiac'], [/Seminal gland/, 'Seminal vesicle'], [/Suprarenal gland/, 'Adrenal (suprarenal) gland'], [/Bucinator/, 'Buccinator'],
];
export function prettyName(raw) {
  let s = String(raw).trim();
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  s = s.replace(/^\[(.*)\]$/, '$1');
  for (const [re, rep] of FIX) s = s.replace(re, rep);
  if (/^\?+x?$/.test(s) || !s) s = 'Unnamed vessel';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const RULES = [
  [/^vertebra c[1-7]$/, (n) => (n === 'vertebra c1' ? 'atlas c1' : 'cervical vertebra')],
  [/^vertebra t\d+$/, 'thoracic vertebra'],
  [/^vertebra l\d$/, 'lumbar vertebra'],
  [/^first rib$/, 'first rib'],
  [/^(second|third|fourth|fifth|sixth|seventh) rib$/, 'true rib'],
  [/^(heighth|eighth|ninth|tenth) rib$/, 'false rib'],
  [/^(eleventh|twelfth) rib$/, 'floating rib'],
  [/^costal cartilage/, 'costal cartilage'],
  [/phalanx of .* of foot$/, 'phalanges of foot'],
  [/phalanx of .*finger$/, 'phalanges of hand'],
  [/metacarpal bone$/, 'metacarpal'],
  [/metatarsal bone$/, 'metatarsal'],
  [/cuneiform bone$/, 'cuneiform'],
  [/incisor$/, 'incisor'],
  [/canine$/, 'canine tooth'],
  [/premolar$/, 'premolar'],
  [/molar tooth$/, 'molar'],
  [/^intervertebral disc|^nucleus pulposus|sacrum coccyx$/, 'intervertebral disc'],
  [/segmental bronch|lobar bronch|intermediate bronch/, 'tracheobronchial tree'],
  [/lobe of thymus$/, 'thymus'],
  [/parathyroid gland$/, 'parathyroid gland'],
  [/coronary leaflet$/, 'aortic valve'],
  [/leaflet of pulmonary valve$/, 'pulmonary valve'],
  [/leaflet of right atrioventricular valve$/, 'tricuspid valve'],
  [/leaflet of left atrioventricular valve$/, 'mitral valve'],
  [/papillary muscle/, 'papillary muscle'],
  [/pulmonary vein|vein of (left|right) lung/, 'pulmonary veins'],
  [/(segmental|lobar|lingular) artery of (left|right) lung/, 'pulmonary trunk'],
  [/coronary artery|interventricular artery|circumflex artery of heart|posterolateral branch/, 'coronary arteries'],
  [/cardiac vein|vein of left ventricle/, 'cardiac veins'],
  [/(sagittal|petrosal|intercavernous|occiptal|occipital|straight|sigmoid|transverse|cavernous) sinus$|basilar venous plexus/, 'dural venous sinuses'],
  [/cerebral artery/, 'anterior cerebral artery'],
  [/genicular|patellar anastomosis/, 'popliteal artery'],
  [/(dorsal|palmar|plantar).*(digital|metacarpal|metatarsal) (arteries|veins)|plantar arch|arcuate artery|carpal (branch|anastomosis)/, null],
  [/lumbar vein|lumbal vein|intercostal vein|subcostal vein|phrenic vein/, 'azygos vein'],
  [/testicular (artery|vein)/, null],
  [/^lat fis|lateral sulcus/, 'lateral sulcus'],
  [/nucleus of .*nerve|nucleus ambiguus|nucleus of solitary tract|salivatory nucleus|cochlear nucleus|vestibular nuclei|nucleus of accessory|accessory nucleus of oculomotor/, 'grey matter of medulla oblongata'],
  [/gyrus|sulcus|sulci|gyri|lobule|precuneus/, null],
  [/^(free|mesocolic|omental) taenia$/, 'taeniae coli'],
  [/region of (abdomen|thorax)|^(epigastric|hypochondriac|hypogastric|inguinal|lumbar|sacral|vertebral|scapular|infrascapular|interscapular|pectoral|mammary|inframammary|presternal) region$/, null],
];

const SKIP_VESSEL_GROUPS = new Set(['aorta', 'systemic arteries', 'systemic veins', 'aortic bifurcation', 'cardiovascular system']);

const SYS_DEFAULT = {
  lymph: 'lymph nodes', skin: 'skin', muscles: 'muscular system', skeleton: 'skeletal system', joints: 'ligament',
  organs: 'visceral systems', vessels: 'cardiovascular system', nerves: 'nervous system',
};

function variants(name) {
  const n = norm(name);
  const out = [n];
  const stripped = n.replace(/ (muscle|muscles|bone|gland|nerve|artery|vein|veins|arteries)$/, '');
  if (stripped !== n) out.push(stripped);
  const noParen = norm(String(name).replace(/\(.*?\)/g, ''));
  if (noParen !== n) out.push(noParen);
  return out;
}

export function lookupInfo(p) {
  const name = p.name;
  for (const v of variants(name)) if (E[v]) return { ...E[v] };
  const n = norm(name);
  for (const [re, key] of RULES) {
    if (re.test(n)) {
      const k = typeof key === 'function' ? key(n) : key;
      if (k && E[norm(k)]) return { ...E[norm(k)] };
      break;
    }
  }
  // Nearest group that has an entry (very broad vessel groups are skipped in favor of artery/vein).
  for (let i = p.groups.length - 1; i >= 0; i--) {
    const g = p.groups[i];
    if (p.sys === 'vessels' && SKIP_VESSEL_GROUPS.has(norm(g))) continue;
    for (const v of variants(g)) if (E[v]) return { ...E[v], partOf: prettyName(g) };
  }
  if (p.sys === 'vessels') {
    const isVein = /vein|venous|sinus|plexus/.test(n);
    const group = p.groups.length ? prettyName(p.groups[p.groups.length - 1]) : null;
    const label = { aorta: 'Branches of the aorta', 'aortic bifurcation': 'Branches of the iliac arteries' }[norm(group || '')] || group;
    return { ...E[isVein ? 'vein' : 'artery'], partOf: label };
  }
  const def = E[norm(SYS_DEFAULT[p.sys])];
  const group = p.groups.length ? prettyName(p.groups[p.groups.length - 1]) : null;
  return def ? { ...def, partOf: group } : { d: '', f: '', x: [] };
}

export const __entries = E; // for coverage checks
