document.addEventListener("DOMContentLoaded", function() {
    const galleryDiv = document.getElementById("gallery");
    const imageContainer = document.getElementById("image-container");

    if (galleryDiv) {
        // Load gallery images from JSON
        fetch('images.json')
            .then(response => response.json())
            .then(images => {
                images.forEach(image => {
                    let imgElement = document.createElement("img");
                    imgElement.src = `resources/${image.filename}`;
                    imgElement.alt = image.title;
                    imgElement.classList.add("thumbnail");

                    let link = document.createElement("a");
                    link.href = `image.html?id=${image.filename}`;
                    link.appendChild(imgElement);

                    galleryDiv.appendChild(link);
                });
            })
            .catch(error => console.error("Error loading images:", error));
    }

    if (imageContainer) {
        // Load image details
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
