$(document).ready(function() {
    $.getJSON("images.json", function(data) {
        if (!data || data.length === 0) {
            console.error("No images found in images.json");
            return;
        }

        let carousel = $(".image-carousel");

        data.forEach(image => {
            let imgElement = $("<img>").attr("src", image.src).attr("alt", image.description);
            let imgWrapper = $("<div>").append(imgElement);
            carousel.append(imgWrapper);
        });

        carousel.slick({
            dots: true,
            infinite: true,
            speed: 300,
            slidesToShow: 3,
            slidesToScroll: 1
        });

        $(".image-carousel img").click(function() {
            let src = $(this).attr("src");
            let alt = $(this).attr("alt");

            $("#lightbox-img").attr("src", src);
            $("#caption").text(alt);
            $("#lightbox").css("display", "block");
        });

        $(".close").click(function() {
            $("#lightbox").css("display", "none");
        });
    }).fail(function() {
        console.error("Error loading images.json");
    });
});
