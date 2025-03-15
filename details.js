document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const imageSrc = params.get("id");
    const description = params.get("desc");

    if (imageSrc && description) {
        document.getElementById("detail-img").src = imageSrc;
        document.getElementById("detail-desc").innerText = description;
    }
});
