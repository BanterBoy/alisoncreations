document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            images.forEach(img => {
                const imgElement = document.createElement("img");
                imgElement.src = `https://alisoncreations.co.uk/${decodeURIComponent(img.src)}`;
                imgElement.alt = img.description || "Image";
                imgElement.classList.add("carousel-image");

                imgElement.onclick = function () {
                    openLightbox(imgElement);
                };

                gallery.appendChild(imgElement);
            });

            // Initialize Flickity after images are loaded
            new Flickity(gallery, {
                cellAlign: 'center',
                contain: true,
                wrapAround: true,
                autoPlay: 3000
            });
        })
        .catch(error => console.error('Error loading images:', error));

    function openLightbox(imgElement) {
        lightbox.style.display = "flex";
        lightboxImg.src = imgElement.src;

        // Clicking on the Lightbox moves to the next image in the carousel
        lightbox.onclick = function () {
            const flickityInstance = Flickity.data(gallery);
            flickityInstance.next();
            lightboxImg.src = flickityInstance.selectedElement.querySelector("img").src;
        };
    }

    lightbox.onclick = function () {
        lightbox.style.display = "none";
    };
});

