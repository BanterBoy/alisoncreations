document.addEventListener("DOMContentLoaded", function () {
    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            if (!Array.isArray(images)) {
                console.error("JSON data is not an array:", images);
                return;
            }

            let carousel = document.querySelector('.carousel');
            carousel.innerHTML = ''; // Clear old images

            images.forEach(image => {
                let anchor = document.createElement("a");
                anchor.href = "#"; // Prevent default link behavior
                anchor.dataset.large = image.src;
                anchor.dataset.title = image.description;

                let imgElement = document.createElement("img");
                imgElement.src = image.src;
                imgElement.alt = image.description;

                anchor.appendChild(imgElement);
                carousel.appendChild(anchor);
            });

            // Initialize Slick with navigation fixes
            $('.carousel').slick({
                slidesToShow: 3,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                dots: true,
                arrows: true,
                prevArrow: '<button type="button" class="slick-prev">❮</button>',
                nextArrow: '<button type="button" class="slick-next">❯</button>'
            });

            // Lightbox Functionality (Fixed)
            document.querySelectorAll(".carousel a").forEach(item => {
                item.addEventListener("click", function (event) {
                    event.preventDefault(); // Stop default anchor behavior

                    let largeImg = document.getElementById("lightbox-img");
                    largeImg.src = this.dataset.large;
                    
                    document.querySelector(".lightbox").style.display = "flex";
                });
            });

            document.querySelector(".lightbox .close").addEventListener("click", function () {
                document.querySelector(".lightbox").style.display = "none";
            });
        })
        .catch(error => console.error("Error loading images:", error));
});
