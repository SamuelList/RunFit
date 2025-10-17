# Gear Images Directory

This directory contains images for all running gear items displayed in the app.

## 📁 Directory Structure
```
public/
  images/
    gear/
      README.md (this file)
      sports_bra.png
      tank_top.png
      short_sleeve.png
      ... (all other gear items)
```

## Running Gear Images

This directory contains images for all running gear items displayed in the app. Each gear item can have an associated image that will be displayed throughout the interface.

## Where Images Appear

Once you add images, they will be displayed in **three main locations**:

1. **Outfit Lists** - Small thumbnail (40×40px) next to each gear item in the recommended outfit
2. **Outfit Item Modal** - Larger image (56×56px) in the header when you tap on an outfit item
3. **Gear Guide** - Medium thumbnail (32×32px) in the grid of all available gear items

All image displays include a fallback to the item's icon if no image is provided.

## Image Requirements

- **Format**: PNG or JPG (PNG recommended for transparent backgrounds)
- **Size**: 400×400 pixels (square aspect ratio)
- **File Size**: Less than 150KB for optimal performance
- **Background**: Transparent background recommended (PNG with alpha channel)
- **Style**: Clean product shot or illustration showing the gear item clearly

## File Naming Convention

## 🚀 How to Add Images

### Step 1: Prepare Your Images
1. Gather or create images for each gear item
2. Resize to 400×400 pixels (square)
3. Optimize file size (aim for <150 KB)
4. Save with correct filename (see table above)

### Step 2: Upload to Public Folder
1. Place all images in `/public/images/gear/` directory
2. Verify filenames match exactly (lowercase, underscores)

### Step 3: Update gearData.js
Open `/src/utils/gearData.js` and update the `image` field for each item:

```javascript
sports_bra: {
  name: "Sports Bra",
  category: "Tops",
  description: "...",
  // ... other fields
  image: '/images/gear/sports_bra.png', // ✅ Update this line
},
```

**Replace `null` with the path:**
- Format: `'/images/gear/FILENAME.png'`
- Must start with `/images/gear/`
- Must match exact filename in public folder

### Step 4: Verify Display
1. Run the app: `npm run dev`
2. Navigate to outfit recommendations
3. Click on gear items to open modal
4. Verify images display correctly

## 🔧 Troubleshooting

### Image Not Showing?
1. ✅ Check filename matches exactly (case-sensitive)
2. ✅ Verify file is in `/public/images/gear/` directory
3. ✅ Ensure path in `gearData.js` starts with `/images/gear/`
4. ✅ Check browser console for 404 errors
5. ✅ Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
6. ✅ Restart dev server

### Image Too Large/Small?
- Resize to 400×400 pixels using:
  - Photoshop
  - GIMP (free)
  - Online tools like Canva or Photopea

### Image Quality Poor?
- Use PNG for better quality
- Ensure source image is high resolution
- Avoid excessive compression

## 💡 Tips for Best Results

### Finding/Creating Images
1. **Product Photos**: Use manufacturer product images (check licensing)
2. **Stock Photos**: Unsplash, Pexels (free, no attribution required)
3. **AI Generation**: Use DALL-E, Midjourney for consistent style
4. **Photography**: Take your own photos with consistent setup
5. **Illustrations**: Create simple vector graphics for consistency

### Consistent Style
- Use same background color/transparency across all images
- Maintain similar lighting and angle
- Keep product roughly same size in frame
- Consider adding subtle shadow for depth

### Accessibility
- Use descriptive filenames
- Ensure good contrast if using colored backgrounds
- Test display on both light and dark modes

## 📊 Progress Tracking

Create a checklist to track your progress:

```
Tops:
[ ] sports_bra.png
[ ] tank_top.png
[ ] short_sleeve.png
[ ] long_sleeve.png
[ ] vest.png
[ ] light_jacket.png
[ ] insulated_jacket.png

Bottoms:
[ ] split_shorts.png
[ ] shorts.png
[ ] tights.png
[ ] thermal_tights.png

... (continue for all items)
```

## 🎯 Quick Start Example

1. **Download sample image** (400×400 PNG)
2. **Rename** to `tank_top.png`
3. **Place** in `/public/images/gear/tank_top.png`
4. **Edit** `/src/utils/gearData.js`:
   ```javascript
   tank_top: {
     // ... existing fields
     image: '/images/gear/tank_top.png', // Update this
   },
   ```
5. **Test** by clicking on "Tank Top" item in app

## 📞 Need Help?

If images aren't displaying:
1. Check this README for troubleshooting steps
2. Verify file paths match exactly
3. Check browser developer console for errors
4. Ensure dev server is running

---

**Last Updated**: December 2024
**Version**: 1.0
