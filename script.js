document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 Script Loaded: Running DOMContentLoaded Event");

    const gallery = document.getElementById("gallery");
    if (!gallery) {
        console.error("❌ Error: No element with ID 'gallery' found.");
        return;
    }

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    fetch('/images.json')  // Make sure the file is at the root
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(images => {
            console.log("✅ Images loaded successfully:", images);

            // Generate HTML dynamically
            let imagesHTML = images.map(img => {
                if (!img.src) {
                    console.warn("⚠️ Skipping an image because 'src' is missing:", img);
                    return "";
                }
                return `
                    <div class="carousel-item">
                        <img src="/${decodeURIComponent(img.src)}" alt="${img.description || "Image"}" 
                             class="gallery-item" onclick="openLightbox('${img.src}', '${img.description || "Image"}')">
                    </div>
                `;
            }).join("");

            // Inject into gallery
            gallery.innerHTML = imagesHTML;

            // Initialize Slick Carousel AFTER images are loaded
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
                console.error("❌ Error: Slick Carousel is not loaded.");
            }
        })
        .catch(error => console.error("❌ Error loading images:", error));

    // Lightbox Function
    window.openLightbox = function (src, caption) {
        if (!lightbox || !lightboxImg || !lightboxCaption) {
            console.error("❌ Error: Lightbox elements are missing.");
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
