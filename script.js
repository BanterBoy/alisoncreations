document.addEventListener("DOMContentLoaded", function () {
    fetch('images.json')  // Make sure the path is correct
        .then(response => response.json())
        .then(data => {
            let carousel = document.getElementById("image-carousel");

            // Check JSON is loading correctly
            console.log("Loaded JSON Data:", data);

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
    console.log("Opening Lightbox with Image:", imageSrc); // Debugging line

    let lightbox = document.getElementById("lightbox");
    let lightboxImg = document.getElementById("lightbox-img");
    let lightboxDesc = document.getElementById("lightbox-desc");

    // Assign the correct image and description
    lightboxImg.src = imageSrc;
    lightboxImg.alt = description;
    lightboxDesc.innerText = description;

    lightbox.style.display = "flex";
}

// Close lightbox
document.getElementById("close-lightbox").addEventListener("click", function() {
    document.getElementById("lightbox").style.display = "none";
});
