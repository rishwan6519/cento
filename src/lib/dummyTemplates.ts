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
    templateName: "Welcome to Our Store",
    description: `
Create a professional vertical retail advertisement in 9:16 aspect ratio with 720×1280 HD resolution.

Place the AI avatar in the center with a warm and welcoming expression. Use the uploaded store image as the background and display the store logo in the top-left corner. Apply the brand colors throughout the video with clean animations and modern typography.

Include:
- Store Name: {{store_name}}
- Business Category: {{business_category}}
- Store Logo: {{store_logo}}
- Store Images: {{store_images}}
- Brand Colors: {{brand_colors}}

Generate a welcoming script introducing the store, highlighting the products and services, and inviting customers to visit.

Finish with the logo, contact details, and a strong call-to-action encouraging customers to visit the store.
`,
  },
  {
    _id: "6797a1f8b1a3e9c4d2800002",
    templateName: "Brand Introduction",
    description: `
Create a premium brand introduction video in 9:16 aspect ratio with 720×1280 HD resolution.

Display the company logo, business images, and brand colors. Position the AI avatar on the left while brand visuals appear on the right with smooth transitions.

Include:
- Company Name: {{store_name}}
- Logo: {{store_logo}}
- Business Images: {{store_images}}
- Business Category: {{business_category}}
- Brand Colors: {{brand_colors}}

Generate a professional script explaining the company's mission, values, and what makes the business unique.

End with the company logo, contact information, and brand slogan.
`,
  },
  {
    _id: "6797a1f8b1a3e9c4d2800003",
    templateName: "New Product Launch",
    description: `
Create a modern product launch advertisement in vertical 9:16 format with 720×1280 HD resolution.

Present the AI avatar beside the featured product. Use dynamic product animations, pricing highlights, and attractive text overlays.

Include:
- Product Name: {{product_name}}
- Product Images: {{product_images}}
- Price: {{price}}
- Discount: {{discount}}
- Product Features: {{features}}
- Store Logo: {{store_logo}}

Generate an engaging promotional script introducing the new product, explaining its benefits, and encouraging customers to purchase.

Finish with a bold Buy Now call-to-action.
`,
  },
  {
    _id: "6797a1f8b1a3e9c4d2800004",
    templateName: "Special Offer",
    description: `
Create a promotional offer advertisement in 9:16 aspect ratio with 720×1280 HD resolution.

Display promotional banners, product images, attractive discount badges, and store branding using vibrant colors.

Include:
- Store Name: {{store_name}}
- Offer Percentage: {{discount}}
- Offer End Date: {{offer_end}}
- Product Images: {{product_images}}
- Store Logo: {{store_logo}}

Generate an exciting promotional script that highlights the limited-time offer and motivates customers to visit immediately.

Finish with the store logo, contact details, and a Limited Time Offer banner.
`,
  },
  {
    _id: "6797a1f8b1a3e9c4d2800005",
    templateName: "Best Seller Showcase",
    description: `
Create a premium retail showcase video in 9:16 aspect ratio with 720×1280 HD resolution.

Present the AI avatar alongside the best-selling products with elegant transitions, feature highlights, customer ratings, and pricing.

Include:
- Product Name: {{product_name}}
- Product Images: {{product_images}}
- Price: {{price}}
- Customer Rating: {{rating}}
- Store Logo: {{store_logo}}

Generate a persuasive script explaining why this product is the customer's favorite and why viewers should purchase it.

End with the store logo and a Shop Now call-to-action.
`,
  },
];
