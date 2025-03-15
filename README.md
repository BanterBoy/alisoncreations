[![Generate Images JSON](https://github.com/BanterBoy/alisoncreations/actions/workflows/generate-json.yml/badge.svg)](https://github.com/BanterBoy/alisoncreations/actions/workflows/generate-json.yml)

## 📸 **Dynamic Lightbox Image Gallery**

🚀 **A fully automated image gallery** hosted on **GitHub Pages**.  
New images are **automatically detected** and updated in the gallery using **GitHub Actions**.

---

## 🎯 **Features**

✅ **Dynamically loads images** from `resources/images/` folder  
✅ **Uses GitHub Actions** to generate `images.json` automatically  
✅ **Displays images in a responsive grid**  
✅ **Uses a Lightbox effect for viewing images** (no separate details page)  
✅ **Fully automated deployment** via GitHub Pages

---

## 📂 **Project Structure**

```
/alisoncreations
│── /resources/images    # Folder containing all JPG images
│── /.github/workflows   # GitHub Actions for automation
│── index.html           # Main gallery page
│── images.json          # JSON file with image data (auto-generated)
│── styles.css           # CSS file for styling
│── script.js            # JS file for loading the gallery
│── README.md            # Documentation
```

---

## 🚀 **Setup Instructions**

### ✅ **1. Enable GitHub Pages**

1. Go to **Settings > Pages** in your repository.
2. Under **Source**, select **"Deploy from branch"**.
3. Choose `main` or `gh-pages`, then **Save**.

Your site will be available at:  
🔗 `https://your-username.github.io/alisoncreations/`

---

### ✅ **2. Add Images**

1. Place JPG images inside the `/resources/images/` folder.
2. **GitHub Actions will automatically update** the `images.json` file.
3. **Visit the site** and see the new images appear automatically.

---

### ✅ **3. How the Website Works**

- **Gallery (`index.html`)**

  - Loads images dynamically from `images.json`
  - Clicking an image opens it in a **Lightbox**

- **GitHub Actions**
  - Updates `images.json` whenever new images are added

---

## 🔧 **Files & Code**

### 📌 **Main Gallery (`index.html`)**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lightbox Image Gallery</title>
    <link rel="stylesheet" href="styles.css" />
    <script defer src="script.js"></script>
  </head>
  <body>
    <h1>Lightbox Image Gallery</h1>
    <div class="gallery" id="gallery"></div>

    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox">
      <span class="close" onclick="closeLightbox()">&times;</span>
      <img class="lightbox-content" id="lightbox-img" />
      <div id="lightbox-caption"></div>
    </div>
  </body>
</html>
```

---

### 📌 **CSS for Styling (`styles.css`)**

```css
body {
  font-family: Arial, sans-serif;
  text-align: center;
  margin: 0;
  background: #f4f4f4;
}

h1 {
  margin: 20px 0;
}

.gallery {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.gallery img {
  width: 200px;
  height: 150px;
  margin: 10px;
  object-fit: cover;
  cursor: pointer;
  border-radius: 5px;
  transition: transform 0.3s ease;
}

.gallery img:hover {
  transform: scale(1.1);
}

/* Lightbox */
.lightbox {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
}

.lightbox-content {
  max-width: 80%;
  max-height: 80%;
  margin: auto;
  display: block;
  margin-top: 5%;
}

#lightbox-caption {
  color: white;
  text-align: center;
  margin-top: 10px;
  font-size: 18px;
}

.close {
  position: absolute;
  top: 15px;
  right: 35px;
  font-size: 40px;
  color: white;
  cursor: pointer;
}
```

---

### 📌 **JavaScript to Load Gallery (`script.js`)**

```js
document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");

  fetch("images.json")
    .then((response) => response.json())
    .then((images) => {
      images.forEach((img) => {
        const imgElement = document.createElement("img");

        imgElement.src = `https://alisoncreations.co.uk/${decodeURIComponent(
          img.src
        )}`;
        imgElement.alt = img.description || "Image";
        imgElement.classList.add("gallery-item");

        imgElement.onclick = () => openLightbox(imgElement.src, imgElement.alt);
        gallery.appendChild(imgElement);
      });
    })
    .catch((error) => console.error("Error loading images:", error));

  function openLightbox(src, caption) {
    lightbox.style.display = "block";
    lightboxImg.src = src;
    lightboxCaption.textContent = caption;
  }

  document.querySelector(".close").addEventListener("click", function () {
    lightbox.style.display = "none";
  });
});
```

---

### 📌 **GitHub Action to Auto-Update `images.json` (`.github/workflows/generate-json.yml`)**

```yaml
name: Generate Images JSON

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  generate-json:
    runs-on: ubuntu-latest

    steps:
      - name: 🛎 Checkout Repository
        uses: actions/checkout@v3

      - name: 🛠 Set Up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: 🔍 Run JSON Generator
        run: node .github/scripts/generate_images_json.js

      - name: 📝 Commit and Push Changes
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add images.json
          git commit -m "🔄 Auto-update images.json"
          git push
        continue-on-error: true
```

---

## 🔥 **How It Works**

1. **You push new images** to `/resources/images/`.
2. **GitHub Actions runs**, updates `images.json`, and commits changes.
3. **The gallery auto-updates** without manual changes.
4. **GitHub Pages serves the latest version** of the site.

---

## 🌟 **Live Demo (Optional)**

[🔗 Visit the Gallery](https://alisoncreations.co.uk/)

---

## 🎯 **Why This is Awesome**

✅ **No manual updates** needed – just add images!  
✅ **GitHub Actions automates everything**  
✅ **Perfect for a static GitHub Pages site**  
✅ **Minimal setup with dynamic loading**

🚀 **Now you have a fully automated image gallery!** Enjoy! 🎉
