$(document).ready(function () {
    $.getJSON("images.json")
        .done(function (data) {
            let carousel = $(".carousel");
            data.forEach(image => {
                let imgElement = `<div><img src="${image.src}" alt="${image.description}" class="carousel-image"></div>`;
                carousel.append(imgElement);
            });

            // Initialize Slick Carousel
            carousel.slick({
                dots: true,
                infinite: true,
                speed: 300,
                slidesToShow: 3,
                slidesToScroll: 1,
                responsive: [
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: 1
                        }
                    }
                ]
            });

            // Lightbox functionality
            $(".carousel-image").on("click", function () {
                let src = $(this).attr("src");
                $("#lightbox-img").attr("src", src);
                $("#lightbox").fadeIn();
            });

            $(".close").on("click", function () {
                $("#lightbox").fadeOut();
            });
        })
        .fail(function () {
            console.error("Error loading images.json");
        });
});
