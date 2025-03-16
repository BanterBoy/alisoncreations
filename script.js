document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 DOMContentLoaded: Script Loaded");

    const gallery = document.getElementById("gallery");
    if (!gallery) {
        console.error("❌ Error: Element with ID 'gallery' not found.");
        return;
    }

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    fetch('/images.json')  // Root folder
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(images => {
            console.log("✅ Images Loaded:", images);

            if (!Array.isArray(images) || images.length === 0) {
                console.error("❌ Error: `images.json` is empty or malformed.");
                return;
            }

            // Make sure gallery starts empty
            gallery.innerHTML = "";

            // Insert images into the carousel
            images.forEach(img => {
                const div = document.createElement("div");
                const imgElement = document.createElement("img");
                imgElement.src = img.src;
                imgElement.alt = img.description || "Image";
                imgElement.classList.add("gallery-item");

                // Click to open lightbox
                imgElement.onclick = () => openLightbox(imgElement.src, imgElement.alt);

                div.appendChild(imgElement);
                gallery.appendChild(div);
            });

            // Initialize Slick after images are added
            setTimeout(() => {
                if (typeof $ !== "undefined" && $.fn.slick) {
                    console.log("🎠 Initializing Slick Carousel...");
                    $("#gallery").slick({
                        dots: true,
                        infinite: true,
                        speed: 500,
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        adaptiveHeight: true
                    });
                } else {
                    console.error("❌ Slick Carousel is not loaded. Check if jQuery and Slick are properly included.");
                }
            }, 100);
        })
        .catch(error => console.error("❌ Error loading images:", error));

    // Lightbox Function
    window.openLightbox = function (src, caption) {
        if (!lightbox || !lightboxImg || !lightboxCaption) {
            console.error("❌ Lightbox elements missing.");
            return;
        }
        lightbox.style.display = "block";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    };

    // Close Lightbox
    document.querySelector(".close")?.addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
