document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.querySelector(".carousel");  // Ensure it's found
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    if (!gallery) {
        console.error("Gallery element not found! Check your HTML.");
        return;
    }

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            images.forEach(img => {
                const imgElement = document.createElement("img");
                imgElement.src = `https://alisoncreations.co.uk/${decodeURIComponent(img.src)}`;
                imgElement.alt = img.description || "Image";
                imgElement.classList.add("gallery-item");

                imgElement.onclick = () => openLightbox(imgElement.src, imgElement.alt);
                gallery.appendChild(imgElement);
            });

            // Initialize Slick Carousel AFTER images are loaded
            $(gallery).slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 3,
                slidesToScroll: 1,
                adaptiveHeight: true
            });

        })
        .catch(error => console.error("Error loading images:", error));

    function openLightbox(src, caption) {
        lightbox.style.display = "block";
        lightboxImg.src = src;
        lightboxCaption.textContent = caption;
    }

    document.querySelector(".close").addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
