document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector(".carousel");

    if (!carousel) {
        console.error("Error: '.carousel' element not found in the HTML!");
        return;
    }

    fetch("/images.json")
        .then(response => response.json())
        .then(images => {
            if (!Array.isArray(images)) {
                throw new Error("Invalid JSON format");
            }

            images.forEach(image => {
                const imgElement = document.createElement("img");
                imgElement.src = image.src;
                imgElement.alt = image.description;
                imgElement.classList.add("carousel-image");
                imgElement.addEventListener("click", () => openLightbox(image.src));

                carousel.appendChild(imgElement);
            });

            // Initialize Slick Carousel
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
});


// Lightbox function
function openLightbox(src) {
    const lightbox = document.querySelector(".lightbox");
    const lightboxImg = document.querySelector(".lightbox img");
    
    if (lightbox && lightboxImg) {
        lightboxImg.src = src;
        lightbox.style.display = "flex";
    } else {
        console.error("Lightbox elements not found");
    }
}

// Close Lightbox
document.querySelector(".lightbox .close").addEventListener("click", function () {
    document.querySelector(".lightbox").style.display = "none";
});
