document.addEventListener("DOMContentLoaded", function () {
    fetch('resources/images/images.json')  // Adjust path if needed
        .then(response => response.json())
        .then(data => {
            let carousel = document.getElementById("image-carousel");

            // Populate carousel dynamically
            data.forEach(imageObj => {
                let imgElement = document.createElement("div");
                imgElement.innerHTML = `
                    <img src="${imageObj.src}" alt="${imageObj.description}" onclick="openLightbox('${imageObj.src}', '${imageObj.description}')">
                    <p class="carousel-caption">${imageObj.description}</p>
                `;
                carousel.appendChild(imgElement);
            });

            // Initialize Slick Carousel
            $("#image-carousel").slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 3,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000
            });
        })
        .catch(error => console.error("Error loading images.json:", error));
});

// Lightbox Functions
function openLightbox(imageSrc, description) {
    let lightbox = document.getElementById("lightbox");
    let lightboxImg = document.getElementById("lightbox-img");
    let lightboxDesc = document.getElementById("lightbox-desc");

    lightbox.style.display = "flex";
    lightboxImg.src = imageSrc;
    lightboxDesc.innerText = description;
}

document.querySelector(".close").addEventListener("click", function() {
    document.getElementById("lightbox").style.display = "none";
});
