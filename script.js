document.addEventListener("DOMContentLoaded", function () {
    const galleryDiv = document.getElementById("gallery");

    if (galleryDiv) {
        // Load gallery images from JSON
        fetch("images.json")
            .then((response) => response.json())
            .then((images) => {
                galleryDiv.innerHTML = ""; // Clear loading text

                images.forEach((image) => {
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
            })
            .catch((error) => {
                console.error("Error loading images:", error);
                galleryDiv.innerHTML = "<p>Failed to load images.</p>";
            });
    }
});
