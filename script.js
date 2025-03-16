document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded. Initializing script...");

    const gallery = document.getElementById("gallery");

    if (!gallery) {
        console.error("❌ ERROR: 'gallery' element not found.");
        return;
    }

    console.log("✅ Found gallery element, loading images...");

    fetch("/images.json")
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch images.json");
            return response.json();
        })
        .then(images => {
            if (!Array.isArray(images)) {
                throw new Error("Invalid JSON format: expected an array.");
            }

            console.log(`✅ Loaded ${images.length} images.`);

            let carouselHtml = "";
            images.forEach(img => {
                let imageSrc = `/${decodeURIComponent(img.src)}`;
                let imageDesc = img.description || "Image";

                carouselHtml += `
                    <div>
                        <a href="${imageSrc}">
                            <img src="${imageSrc}" alt="${imageDesc}">
                        </a>
                    </div>`;
            });

            gallery.innerHTML = carouselHtml;

            console.log("✅ Images added to DOM. Initializing Slick...");

            $(".carousel").slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 1,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                arrows: true
            }).slickLightbox({
                itemSelector: "a",
                navigateByKeyboard: true
            });

            console.log("🚀 Slick Carousel initialized successfully!");

        })
        .catch(error => console.error("❌ Error loading images:", error));
});
