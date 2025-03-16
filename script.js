document.addEventListener("DOMContentLoaded", function () {
    fetch("images.json")
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(images => {
            const carousel = document.querySelector(".carousel");

            if (!carousel) {
                console.error("Carousel element not found!");
                return;
            }

            images.forEach(img => {
                // Create slide container
                let slide = document.createElement("div");

                // Create image element
                let imageElement = document.createElement("img");
                imageElement.src = img.src;
                imageElement.alt = img.description || 'Artwork';

                // Create description element
                let descriptionElement = document.createElement("p");
                descriptionElement.textContent = img.description || '';

                // Append image and description to slide
                slide.appendChild(imageElement);
                slide.appendChild(descriptionElement);

                // Append slide to carousel
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
