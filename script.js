document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");

    console.log("🛠 script.js is running...");

    fetch('images.json')
        .then(response => {
            console.log("📥 Fetching images.json...");
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(images => {
            console.log("✅ images.json loaded:", images);

            if (!Array.isArray(images) || images.length === 0) {
                console.error('❌ Error: images.json is empty or invalid');
                gallery.innerHTML = "<p>No images found.</p>";
                return;
            }

            images.forEach((img, index) => {
                console.log(`🖼 Processing image ${index}:`, img);

                if (!img.src || !img.description) {
                    console.error('❌ Error: Image data missing:', img);
                    return;
                }

                // ✅ Fix: Ensure `src` is correctly decoded
                const decodedSrc = decodeURIComponent(img.src);

                // ✅ Create image element
                const imgElement = document.createElement("img");
                imgElement.src = `https://alisoncreations.co.uk/${decodedSrc}`;
                imgElement.alt = img.description;
                imgElement.classList.add("gallery-item");

                // ✅ Fix: Log if image fails to load
                imgElement.onerror = function () {
                    console.error(`❌ Failed to load image: ${imgElement.src}`);
                };

                // ✅ Open in Lightbox on click
                imgElement.onclick = function () {
                    openLightbox(imgElement.src, imgElement.alt);
                };

                gallery.appendChild(imgElement);
            });

            console.log("🎉 All images processed successfully.");
        })
        .catch(error => {
            console.error('❌ Error loading images.json:', error);
            gallery.innerHTML = "<p>⚠️ Failed to load images.</p>";
        });

    function openLightbox(src, caption) {
        document.getElementById("lightbox").style.display = "block";
        document.getElementById("lightbox-img").src = src;
        document.getElementById("lightbox-caption").textContent = caption;
    }

    document.querySelector(".close").addEventListener("click", function () {
        document.getElementById("lightbox").style.display = "none";
    });
});
