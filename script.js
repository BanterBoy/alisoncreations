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
                let slide = document.createElement("div");

                let imageElement = document.createElement("img");
                imageElement.src = img.src; // fixed here
                imageElement.alt = img.description || 'Artwork';

                let descriptionElement = document.createElement("p");
                descriptionElement.textContent = img.description || '';

                slide.appendChild(imageElement);
                slide.appendChild(descriptionElement);

                carousel.appendChild(slide);
            });

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
