# PWA Icons

## Required Icon Files

The following icon files need to be generated for the PWA to work properly:

1. `icon-192x192.png` - 192x192px PNG (used for mobile home screen)
2. `icon-512x512.png` - 512x512px PNG (used for splash screens and high-res displays)
3. `apple-touch-icon.png` - 180x180px PNG (used for iOS home screen)

## Generating Icons

You can generate these icons from the `icon.svg` file using one of these methods:

### Option 1: Online Tool
1. Go to https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Generate and download all icon sizes

### Option 2: ImageMagick (Command Line)
```bash
# Install ImageMagick if needed: brew install imagemagick

# Generate 192x192
magick convert -density 300 -background none icon.svg -resize 192x192 icon-192x192.png

# Generate 512x512
magick convert -density 300 -background none icon.svg -resize 512x512 icon-512x512.png

# Generate Apple touch icon
magick convert -density 300 -background none icon.svg -resize 180x180 apple-touch-icon.png
```

### Option 3: pwa-asset-generator (Recommended)
```bash
# Install globally
npm install -g pwa-asset-generator

# Generate all icons and splash screens
pwa-asset-generator icon.svg ./public --icon-only --background "#667eea"
```

## Current Status

- ✅ `icon.svg` - Base SVG icon (placeholder - can be customized)
- ❌ `icon-192x192.png` - **NEEDS TO BE GENERATED**
- ❌ `icon-512x512.png` - **NEEDS TO BE GENERATED**
- ❌ `apple-touch-icon.png` - **NEEDS TO BE GENERATED**

## Customizing the Icon

The current `icon.svg` is a placeholder showing a stylized "J" for Jotto. You can:
1. Replace `icon.svg` with a custom design
2. Use design tools like Figma, Sketch, or Illustrator
3. Hire a designer for a professional app icon

Once you have a custom SVG, regenerate the PNG files using one of the methods above.
