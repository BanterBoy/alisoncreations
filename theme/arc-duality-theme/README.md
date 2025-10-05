# ARC Duality Shopify Theme

The **ARC Duality** theme is a bespoke Online Store 2.0 build for Alison Resin Creations. It blends luminous storytelling with modern UX touches including synchronized light/dark theming, custom sections, and polished defaults tailored to ARC's brand palette.

## What's inside

- Production-ready theme files under `arc-duality-theme/` with modular sections (hero, featured grid, story highlights, gallery media, rich text, collapsible FAQs, contact form, collection + product layouts).
- Palette-aware `base.css` with CSS custom properties and responsive styling.
- `theme.js` handles theme mode toggling (localStorage + system preference), cart badge syncing, announcement dismissal, and accessibility enhancements.
- Configured `settings_schema.json`/`settings_data.json` so the theme looks polished immediately after upload.
- Localized copy in `locales/en.default.json` with ARC-specific voice.

## How to use

1. **Prep the brand asset**
   - The production archive should include ARC's logo at `assets/arc-logo.png`.
   - Copy the existing source image (from the repository root) before zipping:
     ```bash
     cp resources/images/ARC-Logo.png theme/arc-duality-theme/assets/arc-logo.png
     ```

2. **Zip & upload**
   - From the repository root run:
     ```bash
     cd theme
     zip -r arc-duality-theme.zip arc-duality-theme
     ```
   - This creates `theme/arc-duality-theme.zip`, which you can then upload in Shopify under **Online Store → Themes → Upload theme**.

3. **Configure settings**
   - From the theme editor adjust brand colours, announcement text, navigation menu, and footer links.
   - Add social links (Instagram, Facebook, TikTok) under **Theme settings → Global socials** to expose header icons.

4. **Enable dark mode**
   - Dark mode is on by default and syncs with system preferences. You can disable the toggle or set a fixed default via **Theme settings → Theme modes**.

5. **Customize content**
   - Home page defaults to Hero → Featured Grid → Story Highlights → Gallery Media. Swap sections, connect collections, and add media/video blocks as needed.
   - Product templates include a metafield callout for `custom.quote`. Populate it from **Product metafields** to surface special messaging.

6. **Contact & FAQs**
   - Page templates are pre-configured for Gallery, About, FAQ, Terms, Privacy, and Contact pages. Assign these templates from the page settings in Shopify to reuse ARC copy and sections.

## Assets

- Copy `resources/images/ARC-Logo.png` into `arc-duality-theme/assets/arc-logo.png` before packaging so header and footer logos render.
- Base palette values are defined as CSS variables; override them via theme settings if needed.

## Need help?

For adjustments beyond theme settings (new sections, metafields, etc.), duplicate the theme in Shopify and iterate safely. The structure follows Shopify OS 2.0 best practices, so extending via additional sections/snippets should feel familiar.
