document.addEventListener("DOMContentLoaded", function () {
    const gallery = document.getElementById("gallery");

    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            images.forEach((img) => {
                const imgElement = document.createElement("img");
                imgElement.src = `https://alisoncreations.co.uk/${decodeURIComponent(img.src)}`;
                imgElement.alt = img.description || "Image";
                imgElement.classList.add("slick-slide");

                // Apply Lightbox2
                const linkElement = document.createElement("a");
                linkElement.href = imgElement.src;
                linkElement.setAttribute("data-lightbox", "gallery");
                linkElement.appendChild(imgElement);

                gallery.appendChild(linkElement);
            });

            // ✅ Initialize Slick Carousel
            $('.carousel').slick({
                infinite: true,
                slidesToShow: 3,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                arrows: true,
                dots: true
            });
        })
        .catch(error => console.error('❌ Error loading images:', error));
});
