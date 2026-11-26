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

const searchForm = document.querySelector("#tutorial-search");
const searchQuery = document.querySelector("#search-query");
const searchResults = document.querySelector("#search-results");
const searchStatus = document.querySelector("#search-status");
const searchMatches = document.querySelector("#search-matches");
const normalizeSearch = (text) => text.toLocaleLowerCase("id-ID").replaceAll("×", "x");
const cleanText = (node) => node.textContent.trim().replace(/\s+/g, " ");

const searchChapters = [...document.querySelectorAll(".chapters > section")].map((section) => {
  const title = cleanText(section.querySelector("h2"));
  const blocks = [...section.querySelectorAll("p, li, h3, caption, th, td, figcaption")].map(cleanText).filter(Boolean);
  return {
    id: section.id,
    title,
    blocks,
    titleKey: normalizeSearch(title),
    fullKey: normalizeSearch([title, ...blocks].join(" ")),
  };
});

function searchExcerpt(block, terms) {
  const text = normalizeSearch(block);
  const positions = terms.map((term) => text.indexOf(term)).filter((index) => index >= 0);
  const first = positions.length ? Math.min(...positions) : 0;
  const before = text.lastIndexOf(" ", Math.max(0, first - 34));
  const start = before < 0 ? 0 : before + 1;
  const targetEnd = start + 160;
  const end = targetEnd >= block.length ? block.length : Math.max(targetEnd - 15, text.lastIndexOf(" ", targetEnd));
  return (start ? "…" : "") + block.slice(start, end).trim() + (end < block.length ? "…" : "");
}

function appendHighlighted(container, snippet, pattern) {
  let previous = 0;
  for (const found of normalizeSearch(snippet).matchAll(pattern)) {
    container.append(snippet.slice(previous, found.index));
    const mark = document.createElement("mark");
    previous = found.index + found[0].length;
    mark.textContent = snippet.slice(found.index, previous);
    container.append(mark);
  }
  container.append(snippet.slice(previous));
}

function updateSearch() {
  const terms = [...new Set(normalizeSearch(searchQuery.value).match(/[\p{L}\p{N}]+%?/gu) ?? [])];
  searchResults.hidden = !terms.length;
  searchMatches.replaceChildren();
  if (!terms.length) {
    searchStatus.textContent = "";
    return;
  }

  const phrase = terms.join(" ");
  const matches = searchChapters
    .filter((chapter) => terms.every((term) => chapter.fullKey.includes(term)))
    .map((chapter) => {
      const titleScore = chapter.titleKey.includes(phrase) ? 6 : 0;
      let bestBlock = chapter.blocks[0] ?? chapter.title;
      let bestScore = -1;
      for (const block of chapter.blocks) {
        const normalized = normalizeSearch(block);
        const count = terms.filter((term) => normalized.includes(term)).length;
        const score = count + (normalized.includes(phrase) ? 3 : 0);
        if (score > bestScore) {
          bestBlock = block;
          bestScore = score;
        }
      }
      return { ...chapter, excerpt: searchExcerpt(bestBlock, terms), score: titleScore + bestScore };
    })
    .sort((a, b) => b.score - a.score);

  searchStatus.textContent = matches.length
    ? matches.length + " bab ditemukan."
    : "Tidak ada hasil. Coba kata lain, seperti kamera atau pompa.";

  const pattern = new RegExp(terms.sort((a, b) => b.length - a.length).join("|"), "gu");
  for (const chapter of matches) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const snippet = document.createElement("span");
    link.href = "#" + chapter.id;
    link.textContent = chapter.title;
    appendHighlighted(snippet, chapter.excerpt, pattern);
    link.append(snippet);
    item.append(link);
    searchMatches.append(item);
  }
}

searchForm.hidden = false;
searchQuery.addEventListener("input", updateSearch);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateSearch();
  searchMatches.querySelector("a")?.focus();
});
updateSearch();

const shareUrl = document.querySelector("#share-url");
const copyShareLink = document.querySelector("#copy-share-link");
const shareStatus = document.querySelector("#share-status");
shareUrl.value = document.querySelector('link[rel="canonical"]').href;
copyShareLink.hidden = false;
copyShareLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    shareStatus.textContent = "Tautan disalin.";
  } catch {
    shareUrl.focus();
    shareUrl.select();
    shareStatus.textContent = "Tautan dipilih. Gunakan perintah Salin di perangkatmu.";
  }
});
