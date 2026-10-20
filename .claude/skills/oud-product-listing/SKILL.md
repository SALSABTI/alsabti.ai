---
name: oud-product-listing
description: Write product names, descriptions and scent notes for Autra Oud products (oud oil, perfumes, bakhoor, oud wood, gift sets) in English and Arabic. Use when the user asks for product descriptions, listing copy, Instagram/WhatsApp captions, or wants to fill in product details for the app or a store.
---

# Autra Oud product listings

## Gather the facts first

Ask only for what's missing (one short message):

- product type: oud oil (dehn al oud), perfume, bakhoor, oud wood (chips), gift set
- size: ml for oils/perfumes, tola (11.66 g / ~12 ml for oil) or grams for wood and bakhoor
- origin of the oud if known (Cambodian, Hindi, Malaysian, Thai, Lao, Papua, Sri Lankan…)
- scent notes or what it smells like; age of the oil if aged
- price and currency (default OMR)
- where it will be used: app product entry, online store, Instagram, WhatsApp broadcast

Never invent facts that buyers rely on: origin, age, purity, "wild"/"natural", certifications
or ingredients. If unknown, leave them out or mark them `[confirm]`.

## Voice

Warm, refined and confident; heritage and craftsmanship; never pushy or cheap ("best price
ever!!!"). Short sentences. Sensory but specific (smoky, honeyed, leathery, barnyard,
woody-sweet, rose, saffron, amber, musk). No more than one emoji per caption, none in product
descriptions.

## Output — give both languages side by side

For each product:

```
Name (EN):        Royal Cambodi Oud
Name (AR):        عود كمبودي ملكي
Short line (EN):  A deep, honeyed Cambodian oud for evening wear.   (≤ 90 chars)
Short line (AR):  …
Description (EN): 2–4 sentences: character, how it wears / lasts, when to wear it.
Description (AR): natural Gulf Arabic, written fresh in Arabic — not a word-for-word translation.
Notes:            Top · Heart · Base   (oils/perfumes only)
Size & price:     3 ml · OMR 25.000
Care / use:       one line (e.g. "Apply a small amount to pulse points; a little goes a long way.")
```

For captions, give 2 options per language, each ≤ 220 characters, ending with how to order
(e.g. "Order on WhatsApp") rather than a hard sell.

Arabic: use proper Arabic punctuation (، ؛ ؟), Arabic product terms (دهن العود، بخور، معمول،
تولة), and keep the brand name "Autra Oud" in Latin letters unless the user gives an Arabic form.

If the user wants to add the products to the app, also give each one as a row the Inventory
form expects: name, type, size, SKU, cost, price, stock, low-stock alert.
