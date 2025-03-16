document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    if (!gallery) {
        console.error("Error: 'gallery' element not found.");
        return;
    }

    // Load images from images.json
    fetch("/images.json")
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch images.json");
            return response.json();
        })
        .then(images => {
            if (!Array.isArray(images)) {
                throw new Error("Invalid JSON format: expected an array.");
            }

            let carouselHtml = "";
            images.forEach(img => {
                carouselHtml += `
                    <div>
                        <img src="/${decodeURIComponent(img.src)}" 
                             alt="${img.description || 'Image'}"
                             class="gallery-item" 
                             onclick="openLightbox(this.src, this.alt)">
                    </div>`;
            });

            gallery.innerHTML = carouselHtml;

            // Initialize Slick Carousel after images are loaded
            $(".carousel").slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 1,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                arrows: true
            });
        })
        .catch(error => console.error("Error loading images:", error));

    // Open Lightbox
    window.openLightbox = function (src, caption) {
        lightbox.style.display = "flex";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    };

    // Close Lightbox
    document.querySelector(".close").addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
