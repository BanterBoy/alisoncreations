document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector(".carousel");

    if (!carousel) {
        console.error("Error: '.carousel' element not found in the HTML!");
        return;
    }

    fetch("/images.json")  // Ensure it's in the root
        .then(response => response.json())
        .then(images => {
            if (!Array.isArray(images) || images.length === 0) {
                throw new Error("Invalid or empty JSON format");
            }

            images.forEach(image => {
                const imgElement = document.createElement("img");
                imgElement.src = image.src;
                imgElement.alt = image.description;
                imgElement.classList.add("carousel-image");
                imgElement.addEventListener("click", () => openLightbox(image.src));

                carousel.appendChild(imgElement);
            });

            // Initialize Slick Carousel AFTER images are added
            $(".carousel").slick({
                dots: true,
                infinite: true,
                speed: 300,
                slidesToShow: 1,
                adaptiveHeight: true
            });
        })
        .catch(error => {
            console.error("Error loading images:", error);
        });

    function openLightbox(imageSrc) {
        const lightbox = document.querySelector(".lightbox");
        const lightboxImg = document.querySelector(".lightbox img");

        if (!lightbox || !lightboxImg) {
            console.error("Error: Lightbox elements not found in the HTML!");
            return;
        }

        lightboxImg.src = imageSrc;
        lightbox.style.display = "flex";
    }

    // Close Lightbox
    document.querySelector(".lightbox .close").addEventListener("click", function () {
        document.querySelector(".lightbox").style.display = "none";
    });
});
