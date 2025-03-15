document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    let imagesArray = [];
    let currentImageIndex = 0;

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            imagesArray = images;
            
            images.forEach((img, index) => {
                const imgElement = document.createElement("div");
                imgElement.classList.add("swiper-slide");

                const image = document.createElement("img");
                image.src = `https://alisoncreations.co.uk/${decodeURIComponent(img.src)}`;
                image.alt = img.description || "Image";
                image.setAttribute("data-index", index);
                image.onclick = () => openLightbox(index);

                imgElement.appendChild(image);
                gallery.appendChild(imgElement);
            });

            new Swiper('.swiper-container', {
                loop: true,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });
        })
        .catch(error => console.error('Error loading images:', error));

    function openLightbox(index) {
        currentImageIndex = index;
        updateLightbox();
        lightbox.style.display = "block";
    }

    function updateLightbox() {
        const imgData = imagesArray[currentImageIndex];
        lightboxImg.src = `https://alisoncreations.co.uk/${decodeURIComponent(imgData.src)}`;
        lightboxCaption.textContent = imgData.description;
    }

    function prevImage() {
        currentImageIndex = (currentImageIndex - 1 + imagesArray.length) % imagesArray.length;
        updateLightbox();
    }

    function nextImage() {
        currentImageIndex = (currentImageIndex + 1) % imagesArray.length;
        updateLightbox();
    }

    function closeLightbox() {
        lightbox.style.display = "none";
    }

    document.querySelector(".close").addEventListener("click", closeLightbox);
    document.querySelector(".lightbox-prev").addEventListener("click", prevImage);
    document.querySelector(".lightbox-next").addEventListener("click", nextImage);
});
