document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    // Fetch images.json
    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            if (!Array.isArray(images) || images.length === 0) {
                console.error('❌ images.json is empty or invalid');
                gallery.innerHTML = "<p>No images found.</p>";
                return;
            }

            images.forEach(img => {
                // Ensure correct src and description are present
                if (!img.src || !img.description) {
                    console.error('❌ Image data missing:', img);
                    return;
                }

                const imgElement = document.createElement("img");

                // ✅ Ensure src is a full URL
                imgElement.src = `https://alisoncreations.co.uk/${img.src}`;
                imgElement.alt = img.description;
                imgElement.classList.add("gallery-item");

                // Open Lightbox on click
                imgElement.onclick = () => openLightbox(imgElement.src, imgElement.alt);

                gallery.appendChild(imgElement);
            });
        })
        .catch(error => console.error('❌ Error loading images:', error));

    // Lightbox functions
    function openLightbox(src, caption) {
        lightbox.style.display = "block";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    }

    document.querySelector(".close").addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
