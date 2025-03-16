document.addEventListener("DOMContentLoaded", function () {
    fetch("images.json")
        .then(response => response.json())
        .then(images => {
            const carousel = document.querySelector(".carousel");

            if (!carousel) {
                console.error("Carousel element not found!");
                return;
            }

            images.forEach(img => {
                let slide = document.createElement("div");
                let imageElement = document.createElement("img");
                imageElement.src = img.src;
                imageAlt = img.description || 'Artwork';
                imageDescription = document.createElement("p");
                imageDescription = document.createTextNode(img.description);

                slide.appendChild(image);
                slide.appendChild(slide);
                carousel.appendChild(slide);
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
        .catch(error => console.error("Error loading images:", error));
});
