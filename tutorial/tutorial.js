const viewer = document.querySelector("#screenshot-viewer");
const screenshot = document.querySelector("#screenshot-image");
const screenshotTitle = document.querySelector("#screenshot-title");
const scrollArea = viewer.querySelector(".viewer-scroll");
const sizeToggle = document.querySelector("#screenshot-size");

function setOriginalSize(original) {
  scrollArea.classList.toggle("is-original", original);
  sizeToggle.setAttribute("aria-pressed", String(original));
  scrollArea.scrollTo(0, 0);
}

for (const button of document.querySelectorAll(".shot-link")) {
  button.addEventListener("click", () => {
    const preview = button.querySelector("img");
    const heading = button.closest("section").querySelector("h2");
    screenshotTitle.textContent = heading.textContent;
    screenshot.src = preview.currentSrc || preview.src;
    screenshot.alt = preview.alt;
    screenshot.width = Number(preview.getAttribute("width"));
    screenshot.height = Number(preview.getAttribute("height"));
    viewer.showModal();
    setOriginalSize(false);
  });
}

sizeToggle.addEventListener("click", () => {
  setOriginalSize(sizeToggle.getAttribute("aria-pressed") === "false");
});
