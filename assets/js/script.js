document.addEventListener("DOMContentLoaded", function () {
    const galleryDiv = document.getElementById("gallery");
    const imageContainer = document.getElementById("image-container");

    if (galleryDiv) {
        fetch('images.json')
            .then(response => response.json())
            .then(images => {
                galleryDiv.innerHTML = ''; // Clear the placeholder message
                if (images.length === 0) {
                    galleryDiv.innerHTML = '<p>No images available.</p>';
                } else {
                    images.forEach(image => {
                        let imgElement = document.createElement("img");
                        imgElement.src = `resources/${image.filename}`;
                        imgElement.alt = image.title;
                        imgElement.classList.add("thumbnail");

                        let link = document.createElement("a");
                        link.href = `resources/${image.filename}`;
                        link.setAttribute("data-lightbox", "gallery");
                        link.setAttribute("data-title", `${image.title} - ${image.description}`);
                        link.appendChild(imgElement);

                        galleryDiv.appendChild(link);
                    });

                    // Ensure Lightbox2 initializes correctly
                    lightbox.option({
                        'resizeDuration': 200,
                        'wrapAround': true
                    });
                }
            })
            .catch(error => {
                console.error("Error loading images:", error);
                galleryDiv.innerHTML = '<p>Error loading images.</p>';
            });
    }

    if (imageContainer) {
        const params = new URLSearchParams(window.location.search);
        const imageName = params.get("id");

        if (imageName) {
            fetch('images.json')
                .then(response => response.json())
                .then(images => {
                    let image = images.find(img => img.filename === imageName);
                    if (image) {
                        let imgElement = document.createElement("img");
                        imgElement.src = `resources/${image.filename}`;
                        imgElement.alt = image.title;

                        let title = document.createElement("h2");
                        title.textContent = image.title;

                        let description = document.createElement("p");
                        description.textContent = image.description;

                        imageContainer.appendChild(title);
                        imageContainer.appendChild(imgElement);
                        imageContainer.appendChild(description);
                    } else {
                        imageContainer.textContent = "Image not found.";
                    }
                })
                .catch(error => console.error("Error loading image details:", error));
        }
    }
});
