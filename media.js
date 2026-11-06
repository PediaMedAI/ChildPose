const nav = document.querySelector(".pnav");
const stops = [...nav.querySelectorAll("a")].map(link => ({
  link,
  section: document.querySelector(link.hash),
}));
const stopColors = ["#7b90e1", "#9c91c7", "#ae87af", "#c07d93", "#d17470", "#de7049", "#ec6b14"];
stops.forEach(({ link }, index) => link.style.setProperty("--c", stopColors[index]));
let scrollFrame = 0;
function markCurrentSection() {
  scrollFrame = 0;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  const marker = window.innerHeight * .35;
  const visible = stops.filter(({ section }) => section.getBoundingClientRect().top <= marker).length;
  const current = atBottom ? stops.length - 1 : Math.max(0, visible - 1);
  nav.style.setProperty("--progress", (current / (stops.length - 1) * 100) + "%");
  stops.forEach(({ link }, index) => {
    link.classList.toggle("read", index < current);
    if (index === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
function scheduleSectionUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(markCurrentSection);
}
window.addEventListener("scroll", scheduleSectionUpdate, { passive: true });
window.addEventListener("resize", scheduleSectionUpdate);
window.addEventListener("load", scheduleSectionUpdate);
markCurrentSection();

const gallery = document.querySelector("#pose-comparison");
const examplePicker = document.querySelector("#example-picker");
const backbone = document.querySelector("#visual-backbone");
const comparisonGrid = document.querySelector("#comparison-grid");
const comparisonStatus = document.querySelector("#comparison-status");
const panels = ["Zero-shot", "Fine-tuned", "ChildPose"];
const rowBounds = [[72, 187], [195, 318], [327, 409], [418, 555], [564, 732], [740, 920], [929, 1129]];
const columnStarts = [25, 96, 168, 239, 310, 382, 453, 524, 596, 667, 739, 810];
const svgNamespace = "http://www.w3.org/2000/svg";
let selectedExample = 0;

function renderComparison() {
  const [top, bottom] = rowBounds[selectedExample];
  const figures = panels.map((label, index) => {
    const left = columnStarts[index * backbone.options.length + backbone.selectedIndex];
    const figure = document.createElement("figure");
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", [left, top, 68, bottom - top].join(" "));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label + " pose overlay, " + backbone.value + ", example " + (selectedExample + 1));
    const image = document.createElementNS(svgNamespace, "image");
    image.setAttribute("href", "assets/qualitative.webp");
    image.setAttribute("width", "904");
    image.setAttribute("height", "1144");
    const clip = document.createElementNS(svgNamespace, "svg");
    clip.setAttribute("x", left);
    clip.setAttribute("y", top);
    clip.setAttribute("width", "68");
    clip.setAttribute("height", bottom - top);
    clip.setAttribute("overflow", "hidden");
    image.setAttribute("x", -left);
    image.setAttribute("y", -top);
    clip.append(image);
    svg.append(clip);
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    figure.append(svg, caption);
    return figure;
  });
  comparisonGrid.replaceChildren(...figures);
  comparisonStatus.textContent = "Showing example " + (selectedExample + 1) + " with " + backbone.value + ".";
  [...examplePicker.children].forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === selectedExample));
  });
}

rowBounds.forEach((_, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = String(index + 1).padStart(2, "0");
  button.setAttribute("aria-label", "Example " + (index + 1));
  button.addEventListener("click", () => {
    selectedExample = index;
    renderComparison();
  });
  examplePicker.append(button);
});
backbone.addEventListener("change", renderComparison);
renderComparison();
gallery.hidden = false;
document.querySelector("#full-comparison").open = false;
