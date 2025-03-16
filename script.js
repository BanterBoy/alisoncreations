document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxCaption = document.getElementById("lightbox-caption");

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            let imageHTML = '';
            images.forEach(img => {
                imageHTML += `<div><img src="${img.src}" alt="${img.description}" class="gallery-item"></div>`;
            });

            gallery.innerHTML = imageHTML;

            $('.carousel').slick({
                dots: true,
                infinite: true,
                speed: 300,
                slidesToShow: 3,
                slidesToScroll: 1,
                arrows: true,
                adaptiveHeight: true
            });

            document.querySelectorAll(".gallery-item").forEach(imgElement => {
                imgElement.addEventListener("click", function () {
                    lightbox.style.display = "block";
                    lightboxImg.src = this.src;
                    lightboxCaption.textContent = this.alt || "Image";
                });
            });
        })
        .catch(error => console.error("Error loading images:", error));

    document.querySelector(".close").addEventListener("click", function () {
        lightbox.style.display = "none";
    });
});
