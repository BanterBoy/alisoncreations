document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            if (!Array.isArray(images) || images.length === 0) {
                console.error('❌ Error: images.json is empty or invalid');
                gallery.innerHTML = "<p>No images found.</p>";
                return;
            }

            images.forEach((img, index) => {
                if (!img.src || !img.description) {
                    console.error('❌ Error: Image data missing:', img);
                    return;
                }

                const imgElement = document.createElement("img");
                imgElement.src = `https://alisoncreations.co.uk/${img.src}`;
                imgElement.alt = img.description;
                imgElement.classList.add("gallery-item");

                // ✅ Option: Open Lightbox on left-click, go to details on right-click
                imgElement.addEventListener("click", function (event) {
                    if (event.button === 0) { // Left-click opens Lightbox
                        openLightbox(imgElement.src, imgElement.alt);
                    } else if (event.button === 2) { // Right-click opens details page
                        window.location.href = `details.html?id=${encodeURIComponent(imgElement.src)}&desc=${encodeURIComponent(imgElement.alt)}`;
                    }
                });

                gallery.appendChild(imgElement);
            });
        })
        .catch(error => console.error('❌ Error loading images:', error));

    function openLightbox(src, caption) {
        lightbox.style.display = "block";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    }

    document.querySelector(".close").addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
