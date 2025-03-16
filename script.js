document.addEventListener("DOMContentLoaded", function () {
    // Load images from images.json
    fetch("images.json")
        .then(response => response.json())
        .then(images => {
            let carousel = document.querySelector(".carousel");

            if (!carousel) {
                console.error("Carousel element not found!");
                return;
            }

            // Clear any existing content
            carousel.innerHTML = "";

            images.forEach(img => {
                let imgElement = document.createElement("div");
                imgElement.innerHTML = `<img src="${img.src}" alt="${img.description || 'Image'}">`;
                carousel.appendChild(imgElement);
            });

            // Initialize Slick
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
