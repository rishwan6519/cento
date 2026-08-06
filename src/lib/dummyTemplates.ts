// // ─── Dummy Templates (with MongoDB-like 24-character hex ObjectIds) ───────────
// export const DUMMY_TEMPLATES = [
//   {
//     _id: "6797a1f8b1a3e9c4d2800001",
//     templateName: "Welcome to Our Store",
//     description:
//       "A friendly AI avatar introduces your business, welcomes customers, highlights your brand values, and invites them to explore your products and services.",
//   },
//   {
//     _id: "6797a1f8b1a3e9c4d2800002",
//     templateName: "Brand Introduction",
//     description:
//       "Tell your brand's story through a professional AI presenter, showcasing your mission, vision, and what makes your business unique.",
//   },
//   {
//     _id: "6797a1f8b1a3e9c4d2800003",
//     templateName: "New Product Launch",
//     description:
//       "An AI avatar presents your newest product with engaging visuals, key features, pricing, and reasons why customers should buy it.",
//   },
//   {
//     _id: "6797a1f8b1a3e9c4d2800004",
//     templateName: "Product Spotlight",
//     description:
//       "Highlight a single product in detail, demonstrating its benefits, unique selling points, and ideal use cases.",
//   },
//   {
//     _id: "6797a1f8b1a3e9c4d2800005",
//     templateName: "Best Seller Showcase",
//     description:
//       "Promote your most popular products with an AI host explaining why they are customer favorites.",
//   },
// ];


export const DUMMY_TEMPLATES = [
  {
    _id: "6797a1f8b1a3e9c4d2800001",
    templateName: "Animate Product + Discount + Caption",
    description: `Use these assets and values:
 
Logo:
(the supplied pentagon-shaped logo image)
 
Product Image:
(the supplied robot head image)
 
Brand Theme Colours:
Orange and Purple
 
Promotional Caption:
GET YOUR CENTO ROBOT NOW!
 
Discount Text:
50% OFF
 
Offer Validity:
Valid till Aug 31, 2026
 
Terms & Conditions:
If none are supplied, display exactly:
TERMS & CONDITIONS APPLY
 
Think like Adobe After Effects creating a reusable motion graphics template (MOGRT), not like a filmmaker creating a commercial.
Create a 6-second looping digital signage advertisement for a restaurant or retail store.
 
This is NOT a cinematic commercial. It is a clean promotional motion graphic similar to the animated advertisements displayed on restaurant menu boards, food court displays, supermarket digital signages, and mall LED displays.
 
Overall Style
Modern premium advertising
Bright, vibrant, eye-catching
Flat 2D motion graphics
Clean layout
Corporate retail aesthetic
High readability
Professional typography
No camera movement
No perspective changes
No scene changes
One continuous composition
Seamless loop
 
The entire animation must remain on one canvas throughout the whole video.
 
Canvas Layout
 
Divide the screen into two primary sections.
 
LEFT SIDE:
 
Occupies roughly 55% of the width.
 
This section is reserved for the supplied product image.
 
The product image must remain large and dominant.
 
RIGHT SIDE:
 
Occupies roughly 45% of the width.
 
Contains all promotional information.
 
Use the brand colour palette as the background for this section.
 
Separate the two sections using a large diagonal dividing line running upward from near the bottom center toward the upper center-right.
 
The diagonal separator should be a design element only.
 
Logo
 
Top-left corner.
 
Small.
 
Always visible.
 
Fade in once.
 
No further animation.
 
Product Image
 
The supplied product image is the hero element.
 
Use the supplied image EXACTLY AS PROVIDED.
 
If a background exists within the supplied image, preserve it exactly.
 
Do not perform background removal under any circumstances.
 
Use the supplied image EXACTLY AS PROVIDED.
 
IMPORTANT: DO NOT ALTER OR MODIFY THE SUPPLIED PRODUCT IMAGE IN ANY WAY! DO NOT MORPH IT. DO NOT ADD OR SUBTRACT ANY ELEMENTS FROM IT.
 
DO NOT:
 
redraw it
stylize it
morph it
animate it
generate another version
change colors
add AI details
replace the background
rotate it
squash it
stretch it
 
Preserve the exact appearance.
 
Only perform:
 
scaling
positioning
subtle entrance animation
optional soft shadow
optional glow
 
After appearing, the image must remain perfectly still.
 
Discount Highlight
 
Place a large skewed parallelogram overlapping the diagonal divider.
 
The shape should be approximately 15–20% of the canvas width so that it becomes an immediate focal element.
 
It should overlap both the product area and the information panel.
 
The shape must stand out prominently without covering important parts of the product image or promotional caption.
 
Use the supplied brand accent colour.
 
Display exactly:
 
{{offer_percentage}}
 
The percentage should be large, bold and highly legible.
 
The shape should visually feel like a premium promotional sticker rather than a small label.
 
Promotional Caption
 
Large headline.
 
Positioned in the upper-middle of the right panel.
 
Display exactly:
 
{{marketing_caption}}
 
Examples:
 
"Crispy Chicken Burger"
 
"Buy 1 Get 1 Free"
 
"Weekend Combo"
 
Typography:
 
Large.
 
Bold.
 
Easy to read.
 
Animation:
 
Very subtle text wobble.
 
Gentle letter shimmer.
 
Tiny upward reveal.
 
The movement should be elegant and minimal, never distracting.
 
Validity Box
 
Place a rounded rectangle near the bottom-right.
 
Display:
 
{{offer_validity}}
 
Example:
 
Valid till July 31
 
Animation:
 
Soft fade.
 
Gentle glow.
 
No movement afterwards.
 
Terms & Conditions
 
Tiny text.
 
Bottom-right corner.
 
Static.
 
No animation.
 
Background
 
Use the supplied brand colours.
 
Add premium graphic design elements such as:
 
abstract geometric shapes
subtle gradients
translucent blobs
soft lines
circles
spark accents
floating dots
diagonal overlays
glossy highlights
modern design flourishes
 
These should remain behind the text and never reduce readability.
 
Motion Style
 
Keep animation restrained and premium.
 
Suitable motions include:
 
fade in
slide in
slight easing
soft glow
shimmer
tiny wobble
minimal floating
subtle opacity breathing
gentle scale pulse
 
Avoid exaggerated movement.
 
This should feel like an expensive digital signage advertisement.
 
 
Loop Behaviour (VERY IMPORTANT)
 
This video is intended to be used as a continuously looping digital signage animation.
 
The first frame and the last frame must be visually identical.
 
DO NOT:
 
fade to black
fade to white
fade out
end the animation
freeze on the last frame
display an ending transition
display a logo outro
display an ending card
 
Instead, the animation must return naturally to its starting state, so that when the video restarts there is no visible jump.
 
The loop should appear infinite.
 
The viewer should not be able to tell where the animation begins or ends.
 
The first frame and last frame must be mathematically identical.
 
Every animation must be cyclic.
 
At no point should any object enter or leave the screen.
 
No element may fade in or fade out.
 
No element may slide in or slide out.
 
No element may appear or disappear.
 
The video should resemble an infinitely looping After Effects composition rather than a video with a beginning and ending.
 
 
Animation Timeline
 
Entire 0.0–6.0 seconds
 
The complete layout is fully visible from the very first frame and remains visible until the final frame.
 
No element should enter or leave the screen.
 
The logo, validity box and footer remain completely stationary.
 
The supplied product image, discount parallelogram and promotional caption receive continuous premium micro-animations.
 
Product Image
• very gentle floating motion (2–4 pixels maximum)
• extremely subtle scale breathing (98%–100%)
• faint ambient glow
• occasional glossy light sweep across the image
• no rotation
• no deformation
 
Discount Parallelogram
• gentle floating motion
• tiny scale pulse
• soft glow pulse
• subtle highlight shimmer
 
Promotional Caption
• slight wobble (1–2 pixels maximum)
• gentle shimmer travelling across the letters
• soft glow pulse
 
Background
• slow animated gradient movement
• floating particles
• decorative shapes with subtle opacity breathing
• occasional soft light sweep
 
All animations must be smooth, periodic and perfectly cyclic so the animation loops seamlessly forever.
 
Footer
 
Display a small footer in the bottom-right corner.
 
If {{terms_and_conditions}} is provided:
 
Display the supplied text exactly.
 
If {{terms_and_conditions}} is empty, null, or not supplied:
 
Display exactly:
 
TERMS & CONDITIONS APPLY
 
The footer should:
 
use small readable text
remain static
never animate
never disappear
always remain visible throughout the video
 
Dynamic Variables
 
The following elements will be provided externally and must replace placeholders exactly:
 
{{logo}}
 
{{product_image}}
 
{{brand_colors}}
 
{{marketing_caption}}
 
{{offer_percentage}}
 
{{offer_validity}}
 
{{terms_and_conditions}}
 
Strict Rules
 
This animation is intended for an LED menu board running 24/7. It must loop seamlessly forever. There must never be an ending transition or fade to black/white.
 
The layout must remain consistent for every generated advertisement.
 
Every advertisement should look like the same branded template with different content inserted.
 
Never redesign the layout.
 
Never move major elements.
 
Never invent additional text.
 
Never crop important parts of the supplied product image.
 
The supplied product image is a locked asset. Its pixels must remain unchanged. Do not deform, morph, redraw, stylize, or transform it. The image must remain stationary. Only non-destructive visual effects such as a soft drop shadow, a faint ambient glow, or a moving highlight passing over the image are permitted.
 
Do not zoom the camera.
 
Do not cut to multiple scenes.
 
Do not introduce cinematic shots.
 
Do not generate people.
 
Do not generate hands.
 
Do not generate food preparation.
 
Do not replace the supplied image.
 
Treat the supplied assets as locked design elements.
 
The result should resemble a professionally animated restaurant digital menu board rather than a traditional commercial.

Terminology Rules (VERY IMPORTANT)
 
The headings and section names in this prompt are instructions for understanding the layout only.
 
They are NOT content.
 
Do not render, display, invent or reference any of these words or phrases in the final output unless they are explicitly supplied as text variables.
 
Examples of words that must never appear unless explicitly provided:
 
Offer Badge
Validity Box
Footer
Promotional Caption
Product Image
Logo
Canvas Layout
Discount Shape
Background
Animation Timeline
Terms & Conditions
Motion Style
Overall Style
Dynamic Variables
Strict Rules
 
Only display text that is explicitly provided through the supplied variables.
Never invent labels, headings or helper text.`
  },
  {
    _id: "6797a1f8b1a3e9c4d2800002",
    templateName: "Animate Only Discount + Caption",
    description: `Use these assets and values:
 
Logo:
(the supplied pentagon-shaped logo image)
 
Product Image:
(the supplied robot head image)
 
Brand Theme Colours:
Orange and Purple
 
Promotional Caption:
GET YOUR CENTO ROBOT NOW!
 
Discount Text:
50% OFF
 
Offer Validity:
Valid till Aug 31, 2026
 
Terms & Conditions:
If none are supplied, display exactly:
TERMS & CONDITIONS APPLY
 
Think like Adobe After Effects creating a reusable motion graphics template (MOGRT), not like a filmmaker creating a commercial.
Create a 6-second looping digital signage advertisement for a restaurant or retail store.
 
This is NOT a cinematic commercial. It is a clean promotional motion graphic similar to the animated advertisements displayed on restaurant menu boards, food court displays, supermarket digital signages, and mall LED displays.
 
Overall Style
Modern premium advertising
Bright, vibrant, eye-catching
Flat 2D motion graphics
Clean layout
Corporate retail aesthetic
High readability
Professional typography
No camera movement
No perspective changes
No scene changes
One continuous composition
Seamless loop
 
The entire animation must remain on one canvas throughout the whole video.
 
Canvas Layout
 
Divide the screen into two primary sections.
 
LEFT SIDE:
 
Occupies roughly 55% of the width.
 
This section is reserved for the supplied product image.
 
The product image must remain large and dominant.
 
RIGHT SIDE:
 
Occupies roughly 45% of the width.
 
Contains all promotional information.
 
Use the brand colour palette as the background for this section.
 
Separate the two sections using a large diagonal dividing line running upward from near the bottom center toward the upper center-right.
 
The diagonal separator should be a design element only.
 
Logo
 
Top-left corner.
 
Small.
 
Always visible.
 
Fade in once.
 
No further animation.
 
Product Image
 
The supplied product image is the hero element.
 
Use the supplied image EXACTLY AS PROVIDED.
 
If a background exists within the supplied image, preserve it exactly.
 
Do not perform background removal under any circumstances.
 
Use the supplied image EXACTLY AS PROVIDED.
 
IMPORTANT: DO NOT ALTER OR MODIFY THE SUPPLIED PRODUCT IMAGE IN ANY WAY! DO NOT MORPH IT. DO NOT ADD OR SUBTRACT ANY ELEMENTS FROM IT.
 
DO NOT:
 
redraw it
stylize it
morph it
animate it
generate another version
change colors
add AI details
replace the background
rotate it
squash it
stretch it
 
Preserve the exact appearance.
 
Only perform:
 
scaling
positioning
subtle entrance animation
optional soft shadow
optional glow
 
After appearing, the image must remain perfectly still.
 
Discount Highlight
 
Place a large skewed parallelogram overlapping the diagonal divider.
 
The shape should be approximately 15–20% of the canvas width so that it becomes an immediate focal element.
 
It should overlap both the product area and the information panel.
 
The shape must stand out prominently without covering important parts of the product image or promotional caption.
 
Use the supplied brand accent colour.
 
Display exactly:
 
{{offer_percentage}}
 
The percentage should be large, bold and highly legible.
 
The shape should visually feel like a premium promotional sticker rather than a small label.
 
Promotional Caption
 
Large headline.
 
Positioned in the upper-middle of the right panel.
 
Display exactly:
 
{{marketing_caption}}
 
Examples:
 
"Crispy Chicken Burger"
 
"Buy 1 Get 1 Free"
 
"Weekend Combo"
 
Typography:
 
Large.
 
Bold.
 
Easy to read.
 
Animation:
 
Very subtle text wobble.
 
Gentle letter shimmer.
 
Tiny upward reveal.
 
The movement should be elegant and minimal, never distracting.
 
Validity Box
 
Place a rounded rectangle near the bottom-right.
 
Display:
 
{{offer_validity}}
 
Example:
 
Valid till July 31
 
Animation:
 
Soft fade.
 
Gentle glow.
 
No movement afterwards.
 
Terms & Conditions
 
Tiny text.
 
Bottom-right corner.
 
Static.
 
No animation.
 
Background
 
Use the supplied brand colours.
 
Add premium graphic design elements such as:
 
abstract geometric shapes
subtle gradients
translucent blobs
soft lines
circles
spark accents
floating dots
diagonal overlays
glossy highlights
modern design flourishes
 
These should remain behind the text and never reduce readability.
 
Motion Style
 
Keep animation restrained and premium.
 
Suitable motions include:
 
fade in
slide in
slight easing
soft glow
shimmer
tiny wobble
minimal floating
subtle opacity breathing
gentle scale pulse
 
Avoid exaggerated movement.
 
This should feel like an expensive digital signage advertisement.
 
 
Loop Behaviour (VERY IMPORTANT)
 
This video is intended to be used as a continuously looping digital signage animation.
 
The first frame and the last frame must be visually identical.
 
DO NOT:
 
fade to black
fade to white
fade out
end the animation
freeze on the last frame
display an ending transition
display a logo outro
display an ending card
 
Instead, the animation must return naturally to its starting state, so that when the video restarts there is no visible jump.
 
The loop should appear infinite.
 
The viewer should not be able to tell where the animation begins or ends.
 
The first frame and last frame must be mathematically identical.
 
Every animation must be cyclic.
 
At no point should any object enter or leave the screen.
 
No element may fade in or fade out.
 
No element may slide in or slide out.
 
No element may appear or disappear.
 
The video should resemble an infinitely looping After Effects composition rather than a video with a beginning and ending.
 
 
Animation Timeline
 
Entire 0.0–6.0 seconds
 
The complete layout is fully visible from the very first frame and remains visible until the final frame.
 
No element should enter or leave the screen.
 
The supplied product image remains completely stationary throughout the animation.
 
Only non-destructive visual effects may affect the product image, such as:
• faint ambient glow
• soft drop shadow
• occasional glossy light sweep
 
Do not translate, rotate, scale, wobble or deform the product image.
Do not animate the product image or product in any way.
 
Discount Parallelogram
• gentle floating motion
• tiny scale pulse
• subtle glow pulse
• light shimmer
 
Promotional Caption
• slight wobble (1–2 pixels maximum)
• gentle shimmer
• soft glow pulse
 
Background
• animated gradients
• floating particles
• opacity breathing
• decorative light sweeps
 
Logo, validity box and footer remain completely static.
 
All animations must loop seamlessly forever.
 
Footer
 
Display a small footer in the bottom-right corner.
 
If {{terms_and_conditions}} is provided:
 
Display the supplied text exactly.
 
If {{terms_and_conditions}} is empty, null, or not supplied:
 
Display exactly:
 
TERMS & CONDITIONS APPLY
 
The footer should:
 
use small readable text
remain static
never animate
never disappear
always remain visible throughout the video
 
Dynamic Variables
 
The following elements will be provided externally and must replace placeholders exactly:
 
{{logo}}
 
{{product_image}}
 
{{brand_colors}}
 
{{marketing_caption}}
 
{{offer_percentage}}
 
{{offer_validity}}
 
{{terms_and_conditions}}
 
Strict Rules
 
This animation is intended for an LED menu board running 24/7. It must loop seamlessly forever. There must never be an ending transition or fade to black/white.
 
The layout must remain consistent for every generated advertisement.
 
Every advertisement should look like the same branded template with different content inserted.
 
Never redesign the layout.
 
Never move major elements.
 
Never invent additional text.
 
Never crop important parts of the supplied product image.
 
The supplied product image is a locked asset. Its pixels must remain unchanged. Do not deform, morph, redraw, stylize, or transform it. The image must remain stationary. Only non-destructive visual effects such as a soft drop shadow, a faint ambient glow, or a moving highlight passing over the image are permitted.
 
Do not zoom the camera.
 
Do not cut to multiple scenes.
 
Do not introduce cinematic shots.
 
Do not generate people.
 
Do not generate hands.
 
Do not generate food preparation.
 
Do not replace the supplied image.
 
Treat the supplied assets as locked design elements.
 
The result should resemble a professionally animated restaurant digital menu board rather than a traditional commercial.

Terminology Rules (VERY IMPORTANT)
 
The headings and section names in this prompt are instructions for understanding the layout only.
 
They are NOT content.
 
Do not render, display, invent or reference any of these words or phrases in the final output unless they are explicitly supplied as text variables.
 
Examples of words that must never appear unless explicitly provided:
 
Offer Badge
Validity Box
Footer
Promotional Caption
Product Image
Logo
Canvas Layout
Discount Shape
Background
Animation Timeline
Terms & Conditions
Motion Style
Overall Style
Dynamic Variables
Strict Rules
 
Only display text that is explicitly provided through the supplied variables.
Never invent labels, headings or helper text.`
  },
  {
    _id: "6797a1f8b1a3e9c4d2800003",
    templateName: "Seamless Retail Promo Motion Graphics Template",
    description: `Seamless Retail Promo Motion Graphics Template
 
Use these assets and values:
 
Logo:
(the supplied pentagon-shaped logo image)
 
Product Image:
(the supplied robot head image)
 
Brand Theme Colours:
Orange and Purple
 
Promotional Caption:
GET YOUR CENTO ROBOT NOW!
 
Discount Text:
50% OFF
 
Offer Validity:
Valid till Aug 31, 2026
 
Terms & Conditions:
If none are supplied, display exactly:
TERMS & CONDITIONS APPLY
 
Think like Adobe After Effects creating a reusable motion graphics template (MOGRT), not like a filmmaker creating a commercial.
Create a 6-second looping digital signage advertisement for a restaurant or retail store.
 
This is NOT a cinematic commercial. It is a clean promotional motion graphic similar to the animated advertisements displayed on restaurant menu boards, food court displays, supermarket digital signages, and mall LED displays.
 
Overall Style
Modern premium advertising
Bright, vibrant, eye-catching
Flat 2D motion graphics
Clean layout
Corporate retail aesthetic
High readability
Professional typography
No camera movement
No perspective changes
No scene changes
One continuous composition
Seamless loop
 
The entire animation must remain on one canvas throughout the whole video.
 
Canvas Layout
 
Divide the screen into two primary sections.
 
LEFT SIDE:
 
Occupies roughly 55% of the width.
 
This section is reserved for the supplied product image.
 
The product image must remain large and dominant.
 
RIGHT SIDE:
 
Occupies roughly 45% of the width.
 
Contains all promotional information.
 
Use the brand colour palette as the background for this section.
 
Separate the two sections using a large diagonal dividing line running upward from near the bottom center toward the upper center-right.
 
The diagonal separator should be a design element only.
 
Logo
 
Top-left corner.
 
Small.
 
Always visible.
 
Fade in once.
 
No further animation.
 
Product Image
 
The supplied product image is the hero element.
 
Use the supplied image EXACTLY AS PROVIDED.
 
If a background exists within the supplied image, preserve it exactly.
 
Do not perform background removal under any circumstances.
 
Use the supplied image EXACTLY AS PROVIDED.
 
IMPORTANT: DO NOT ALTER OR MODIFY THE SUPPLIED PRODUCT IMAGE IN ANY WAY! DO NOT MORPH IT. DO NOT ADD OR SUBTRACT ANY ELEMENTS FROM IT.
 
DO NOT:
 
redraw it
stylize it
morph it
animate it
generate another version
change colors
add AI details
replace the background
rotate it
squash it
stretch it
 
Preserve the exact appearance.
 
Only perform:
 
scaling
positioning
subtle entrance animation
optional soft shadow
optional glow
 
After appearing, the image must remain perfectly still.
 
Discount Highlight
 
Place a large skewed parallelogram overlapping the diagonal divider.
 
The shape should be approximately 15–20% of the canvas width so that it becomes an immediate focal element.
 
It should overlap both the product area and the information panel.
 
The shape must stand out prominently without covering important parts of the product image or promotional caption.
 
Use the supplied brand accent colour.
 
Display exactly:
 
{{offer_percentage}}
 
The percentage should be large, bold and highly legible.
 
The shape should visually feel like a premium promotional sticker rather than a small label.
 
Promotional Caption
 
Large headline.
 
Positioned in the upper-middle of the right panel.
 
Display exactly:
 
{{marketing_caption}}
 
Examples:
 
"Crispy Chicken Burger"
 
"Buy 1 Get 1 Free"
 
"Weekend Combo"
 
Typography:
 
Large.
 
Bold.
 
Easy to read.
 
Animation:
 
Very subtle text wobble.
 
Gentle letter shimmer.
 
Tiny upward reveal.
 
The movement should be elegant and minimal, never distracting.
 
Validity Box
 
Place a rounded rectangle near the bottom-right.
 
Display:
 
{{offer_validity}}
 
Example:
 
Valid till July 31
 
Animation:
 
Soft fade.
 
Gentle glow.
 
No movement afterwards.
 
Terms & Conditions
 
Tiny text.
 
Bottom-right corner.
 
Static.
 
No animation.
 
Background
 
Use the supplied brand colours.
 
Add premium graphic design elements such as:
 
abstract geometric shapes
subtle gradients
translucent blobs
soft lines
circles
spark accents
floating dots
diagonal overlays
glossy highlights
modern design flourishes
 
These should remain behind the text and never reduce readability.
 
Motion Style
 
Keep animation restrained and premium.
 
Suitable motions include:
 
fade in
slide in
slight easing
soft glow
shimmer
tiny wobble
minimal floating
subtle opacity breathing
gentle scale pulse
 
Avoid exaggerated movement.
 
This should feel like an expensive digital signage advertisement.
 
 
Loop Behaviour (VERY IMPORTANT)
 
This video is intended to be used as a continuously looping digital signage animation.
 
The first frame and the last frame must be visually identical.
 
DO NOT:
 
fade to black
fade to white
fade out
end the animation
freeze on the last frame
display an ending transition
display a logo outro
display an ending card
 
Instead, the animation must return naturally to its starting state, so that when the video restarts there is no visible jump.
 
The loop should appear infinite.
 
The viewer should not be able to tell where the animation begins or ends.
 
The first frame and last frame must be mathematically identical.
 
Every animation must be cyclic.
 
At no point should any object enter or leave the screen.
 
No element may fade in or fade out.
 
No element may slide in or slide out.
 
No element may appear or disappear.
 
The video should resemble an infinitely looping After Effects composition rather than a video with a beginning and ending.
 
Animation Timeline
 
Entire 0.0–6.0 seconds
 
The entire layout remains perfectly fixed throughout the animation.
 
No object changes position.
 
No object changes size.
 
No object rotates.
 
No object enters or leaves the screen.
 
The supplied product image, promotional caption, discount parallelogram, logo, validity box and footer remain locked in place.
 
Create visual interest only using premium ambient effects such as:
 
• slow animated background gradients
• soft glow pulses
• glossy moving highlights
• subtle shimmer
• gentle opacity breathing
• floating spark particles
• decorative light streaks
• translucent geometric elements with slow movement
 
A faint glossy highlight may occasionally sweep across the product image, promotional caption and discount parallelogram without altering their positions.
 
The overall composition should feel premium, elegant and alive while remaining visually static.
 
Every animation must be cyclic and seamlessly repeat forever.
Footer
 
Display a small footer in the bottom-right corner.
 
If {{terms_and_conditions}} is provided:
 
Display the supplied text exactly.
 
If {{terms_and_conditions}} is empty, null, or not supplied:
 
Display exactly:
 
TERMS & CONDITIONS APPLY
 
The footer should:
 
use small readable text
remain static
never animate
never disappear
always remain visible throughout the video
 
Dynamic Variables
 
The following elements will be provided externally and must replace placeholders exactly:
 
{{logo}}
 
{{product_image}}
 
{{brand_colors}}
 
{{marketing_caption}}
 
{{offer_percentage}}
 
{{offer_validity}}
 
{{terms_and_conditions}}
 
Strict Rules
 
This animation is intended for an LED menu board running 24/7. It must loop seamlessly forever. There must never be an ending transition or fade to black/white.
 
The layout must remain consistent for every generated advertisement.
 
Every advertisement should look like the same branded template with different content inserted.
 
Never redesign the layout.
 
Never move major elements.
 
Never invent additional text.
 
Never crop important parts of the supplied product image.
 
The supplied product image is a locked asset. Its pixels must remain unchanged. Do not deform, morph, redraw, stylize, or transform it. The image must remain stationary. Only non-destructive visual effects such as a soft drop shadow, a faint ambient glow, or a moving highlight passing over the image are permitted.
 
Do not zoom the camera.
 
Do not cut to multiple scenes.
 
Do not introduce cinematic shots.
 
Do not generate people.
 
Do not generate hands.
 
Do not generate food preparation.
 
Do not replace the supplied image.
 
Treat the supplied assets as locked design elements.
 
The result should resemble a professionally animated restaurant digital menu board rather than a traditional commercial.
 
Terminology Rules (VERY IMPORTANT)
 
The headings and section names in this prompt are instructions for understanding the layout only.
 
They are NOT content.
 
Do not render, display, invent or reference any of these words or phrases in the final output unless they are explicitly supplied as text variables.
 
Examples of words that must never appear unless explicitly provided:
 
Offer Badge
Validity Box
Footer
Promotional Caption
Product Image
Logo
Canvas Layout
Discount Shape
Background
Animation Timeline
Terms & Conditions
Motion Style
Overall Style
Dynamic Variables
Strict Rules
 
Only display text that is explicitly provided through the supplied variables.
Never invent labels, headings or helper text.
 `
  },
  {
    _id: "6797a1f8b1a3e9c4d2800004",
    templateName: "Special Offer",
    description:
      "Optimized for a vertical 9:16 aspect ratio in vibrant 720p HD resolution to drive immediate urgency and boost customer foot traffic. Features high-energy visual banners, bold discount badges, and dynamic product spotlights set against an attention-grabbing background. Supported by a thrilling voiceover emphasizing limited-time savings, and wrapping up with a highly prominent promotional closing screen.",
  },
  {
    _id: "6797a1f8b1a3e9c4d2800005",
    templateName: "Best Seller Showcase",
    description:
      "Crafted for a vertical 9:16 aspect ratio in luxury 720p HD resolution to highlight your top-performing products and customer favorites. Integrates sleek gallery transitions, star rating emblems, value points, and polished reflections to elevate perceived product value. A confident and persuasive voiceover explains why these items are fan favorites, finishing strong with a compelling 'Shop Now' call-to-action.",
  },
];
