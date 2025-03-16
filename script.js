document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded: Script is running."); // Debugging log

    const gallery = document.getElementById("gallery");
    if (!gallery) {
        console.error("Error: Element with ID 'gallery' not found in the HTML.");
        return; // Stop execution if gallery is missing
    }

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    fetch('/images.json')  // Make sure it's in the root directory
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(images => {
            console.log("Images loaded successfully:", images); // Debugging log

            images.forEach((img, index) => {
                if (!img.src) {
                    console.warn(`Skipping image ${index}: Missing 'src' property`);
                    return;
                }

                const imgElement = document.createElement("img");
                imgElement.src = `/${decodeURIComponent(img.src)}`;
                imgElement.alt = img.description || "Image";
                imgElement.classList.add("gallery-item");

                imgElement.onclick = () => openLightbox(imgElement.src, imgElement.alt);
                
                gallery.appendChild(imgElement);
            });

            // Initialize Slick Carousel AFTER images are loaded
            if (typeof $ !== "undefined" && $.fn.slick) {
                console.log("Initializing Slick Carousel...");
                $(gallery).slick({
                    dots: true,
                    infinite: true,
                    speed: 500,
                    slidesToShow: 3,
                    slidesToScroll: 1,
                    adaptiveHeight: true
                });
            } else {
                console.error("Error: Slick Carousel is not loaded.");
            }
        })
        .catch(error => console.error("Error loading images:", error));

    function openLightbox(src, caption) {
        if (!lightbox || !lightboxImg || !lightboxCaption) {
            console.error("Error: Lightbox elements are missing.");
            return;
        }

        lightbox.style.display = "block";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    }

    document.querySelector(".close")?.addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
