document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");

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
                        <a href="/${decodeURIComponent(img.src)}">
                            <img src="/${decodeURIComponent(img.src)}" 
                                 alt="${img.description || 'Image'}">
                        </a>
                    </div>`;
            });

            gallery.innerHTML = carouselHtml;

            // Initialize Slick Carousel WITH LIGHTBOX SUPPORT
            $(".carousel").slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 1,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                arrows: true
            }).slickLightbox({
                itemSelector: "a", // Enables lightbox on image click
                navigateByKeyboard: true
            });
        })
        .catch(error => console.error("Error loading images:", error));
});
