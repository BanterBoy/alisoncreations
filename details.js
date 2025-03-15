document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src");
    const desc = params.get("desc");

    if (src && desc) {
        document.getElementById("detail-img").src = src;
        document.getElementById("detail-desc").innerText = desc;
    }
});
