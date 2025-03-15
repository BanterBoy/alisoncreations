Sure! Here's a **README.md** file that explains everything about your **dynamic image gallery** project.

---

# 📸 **Dynamic Image Gallery**

🚀 **A fully automated image gallery** hosted on **GitHub Pages**. New images are **automatically detected** and updated in the gallery using **GitHub Actions**.

## 🎯 **Features**

✅ Dynamically loads images from `resources/` folder  
✅ Uses **GitHub Actions** to generate `images.json` whenever images change  
✅ Displays images in a **responsive gallery** with a Lightbox effect  
✅ Clicking an image opens a **dedicated details page** with a description  
✅ **Fully automated deployment** via GitHub Pages

---

## 📂 **Project Structure**

```
/my-image-gallery
│── /resources            # Folder containing all JPG images
│── /github
│   ├── /scripts
│   │   └── generate_images_json.js  # Script to generate images.json
│   └── /workflows
│       └── generate-json.yml  # GitHub Action to update images.json
│── index.html            # Main gallery page
│── details.html          # Individual image details page
│── images.json           # JSON file with image data (auto-generated)
│── styles.css            # CSS file for styling
│── script.js             # JS file to load gallery images
│── details.js            # JS file for image details page
│── README.md             # Documentation
```

---

## 🚀 **Setup Instructions**

### ✅ **1. Enable GitHub Pages**

1. Go to **Settings > Pages** in your repository.
2. Under **Source**, select **"Deploy from branch"**.
3. Choose `main` or `gh-pages`, then **Save**.

Your site will be available at:  
🔗 `https://your-username.github.io/my-image-gallery/`

---

### ✅ **2. Add Images**

1. Place JPG images inside the `/resources/` folder.
2. **GitHub Actions will automatically update** the `images.json` file.

---

### ✅ **3. How the Website Works**

- **Gallery (`index.html`)**  
  Loads images dynamically from `images.json`.
- **Image Click**  
  Opens `details.html` showing the image and its description.
- **GitHub Actions**  
  Updates `images.json` whenever new images are added.

---

## 🔧 **Files & Code**

### 📌 **Main Gallery (`index.html`)**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dynamic Image Gallery</title>
    <link rel="stylesheet" href="styles.css" />
    <script defer src="script.js"></script>
  </head>
  <body>
    <h1>Dynamic Image Gallery</h1>
    <div class="gallery" id="gallery"></div>
  </body>
</html>
```

### 📌 **Image Details (`details.html`)**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Image Details</title>
    <link rel="stylesheet" href="styles.css" />
    <script defer src="details.js"></script>
  </head>
  <body>
    <h1>Image Details</h1>
    <div class="image-container">
      <img id="detail-img" src="" alt="" />
      <p id="detail-desc"></p>
    </div>
    <a href="index.html">Back to Gallery</a>
  </body>
</html>
```

### 📌 **JavaScript for Gallery (`script.js`)**

```js
fetch("images.json")
  .then((response) => response.json())
  .then((images) => {
    const gallery = document.getElementById("gallery");
    images.forEach((img) => {
      const imgElement = document.createElement("img");
      imgElement.src = img.src;
      imgElement.alt = img.description;
      imgElement.onclick = () => {
        window.location.href = `details.html?src=${encodeURIComponent(
          img.src
        )}&desc=${encodeURIComponent(img.description)}`;
      };
      gallery.appendChild(imgElement);
    });
  })
  .catch((error) => console.error("Error loading images:", error));
```

### 📌 **JavaScript for Details Page (`details.js`)**

```js
document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  const desc = params.get("desc");

  if (src && desc) {
    document.getElementById("detail-img").src = src;
    document.getElementById("detail-desc").innerText = desc;
  }
});
```

---

## 🤖 **Automating Image JSON with GitHub Actions**

### 📌 **Generate `images.json` (`.github/scripts/generate_images_json.js`)**

```js
const fs = require("fs");
const path = require("path");

const imageDir = "./resources";
const outputFile = "./images.json";

fs.readdir(imageDir, (err, files) => {
  if (err) {
    console.error("Error reading directory:", err);
    process.exit(1);
  }

  const images = files
    .filter((file) => file.endsWith(".jpg"))
    .map((file) => ({
      src: `resources/${file}`,
      description: file.replace(".jpg", "").replace(/_/g, " "),
    }));

  fs.writeFileSync(outputFile, JSON.stringify(images, null, 2));
  console.log("✅ Image list updated in images.json");
});
```

### 📌 **GitHub Action (`.github/workflows/generate-json.yml`)**

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

1. **You push new images** to `/resources/`.
2. **GitHub Actions runs**, updates `images.json`, and commits changes.
3. **The gallery auto-updates** without manual changes.
4. **GitHub Pages serves the latest version** of the site.

---

## 🌟 **Live Demo (Optional)**

[🔗 Visit the Gallery](https://your-username.github.io/my-image-gallery/)

---

## 🎯 **Why This is Awesome**

✅ **No manual updates** needed – just add images!  
✅ **GitHub Actions automates everything**  
✅ **Perfect for a static GitHub Pages site**  
✅ **Minimal setup with dynamic loading**

🚀 **Now you have a fully automated image gallery!** Enjoy! 🎉

---

Let me know if you need any modifications! 🔥
