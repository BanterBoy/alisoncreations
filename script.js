fetch('images.json')
    .then(response => response.json())
    .then(images => {
        const gallery = document.getElementById("gallery");

        images.forEach(img => {
            const imgElement = document.createElement("img");

            // ✅ Construct the full absolute URL
            imgElement.src = `https://alisoncreations.co.uk/${img.src}`;
            imgElement.alt = img.description || "Image";

            // Redirect to details page on click
            imgElement.addEventListener("click", function () {
                window.location.href = `details.html?src=${encodeURIComponent(img.src)}&desc=${encodeURIComponent(img.description)}`;
            });

            gallery.appendChild(imgElement);
        });
    })
    .catch(error => console.error('❌ Error loading images:', error));
