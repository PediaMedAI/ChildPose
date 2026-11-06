const metrics = ["AP", "AP₅₀", "AP₇₅", "AR", "Jitter", "CWJ", "Flicker"];

function appendCell(row, tag, value, className = "") {
  const cell = document.createElement(tag);
  cell.textContent = value;
  cell.className = className;
  row.append(cell);
  return cell;
}

function mountBenchmark(container) {
  const benchmark = container.dataset.benchmark;
  const familyFilter = document.querySelector(`[data-family-for="${benchmark}"]`);
  let sortMetric = 0;
  let descending = true;

  function render() {
    const family = familyFilter?.value ?? "all";
    const rows = paperResults[benchmark]
      .filter(row => family === "all" || row[1] === family)
      .sort((a, b) => (Number(a[sortMetric + 4]) - Number(b[sortMetric + 4])) * (descending ? -1 : 1));
    const bestScores = metrics.map((_, index) => {
      const values = rows.map(row => Number(row[index + 4]));
      return index < 4 ? Math.max(...values) : Math.min(...values);
    });

    const table = document.createElement("table");
    table.setAttribute("aria-labelledby", container.getAttribute("aria-labelledby"));
    const headers = table.createTHead().insertRow();
    appendCell(headers, "th", "Model / visual encoder", "benchmark-model").scope = "col";

    metrics.forEach((metric, index) => {
      const cell = appendCell(headers, "th", "", "numeric");
      cell.scope = "col";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = metric + (index < 4 ? " ↑" : " ↓");
      button.setAttribute("aria-label", "Sort by " + metric);
      if (index === sortMetric) {
        cell.setAttribute("aria-sort", descending ? "descending" : "ascending");
        const direction = document.createElement("span");
        direction.className = "direction";
        direction.setAttribute("aria-hidden", "true");
        direction.textContent = descending ? "▾" : "▴";
        button.prepend(direction);
      }
      button.addEventListener("click", () => {
        descending = index === sortMetric ? !descending : index < 4;
        sortMetric = index;
        render();
        container.querySelectorAll("th button")[index].focus({ preventScroll: true });
      });
      cell.append(button);
    });

    const body = table.createTBody();
    for (const [name, , detail, ours, ...scores] of rows) {
      const row = body.insertRow();
      if (ours) row.className = "ours";
      const heading = appendCell(row, "th", name, "benchmark-model");
      heading.scope = "row";
      if (detail) {
        const secondary = document.createElement("small");
        secondary.textContent = detail;
        heading.append(secondary);
      }
      scores.forEach((score, index) => {
        appendCell(row, "td", score, Number(score) === bestScores[index] ? "numeric best" : "numeric");
      });
    }
    container.replaceChildren(table);
  }

  familyFilter?.addEventListener("change", render);
  render();
}

for (const container of document.querySelectorAll("[data-benchmark]")) {
  mountBenchmark(container);
}

const referenceTables = {
  ablation: {
    headers: ["Visual encoder", "Variant", "AP ↑", "AP₅₀ ↑", "AP₇₅ ↑", "AR ↑"],
    numericFrom: 2,
    rows: paperResults.ablation
  },
  memory: {
    headers: ["Setting", "Capacity", "AP ↑", "AR ↑"],
    numericFrom: 1,
    rows: [
      ["Inference truncation", "0", "0.8918", "0.9150"],
      ["Inference truncation", "1", "0.8957", "0.9167"],
      ["Inference truncation", "2", "0.8958", "0.9168"],
      ["Inference truncation", "4", "0.8957", "0.9167"],
      ["Inference truncation", "6", "0.8956", "0.9167"],
      ["Full retraining", "0", "0.8625", "0.8962"],
      ["Full retraining", "2", "0.8949", "0.9159"],
      ["Full retraining", "4", "0.8956", "0.9170"],
      ["Full retraining", "6", "0.8956", "0.9167"],
      ["Full retraining", "7", "0.8948", "0.9164"]
    ]
  },
  decoding: {
    headers: ["Decoder / post-processing", "AP ↑"],
    numericFrom: 1,
    rows: [
      ["Plain argmax (reported setting)", "0.8956"],
      ["Quarter-pixel refinement", "0.8984"],
      ["DARK refinement", "0.9006"],
      ["Flip + argmax", "0.8973"],
      ["Flip + DARK", "0.9032"]
    ]
  },
  speed: {
    headers: ["Model", "Parameters (M)", "End-to-end (ms)", "Steady-state (ms)", "Steady-state FPS"],
    numericFrom: 1,
    rows: [
      ["Standard fine-tuning", "89.995", "4.966 ± 0.030", "4.962 ± 0.029", "201.52 ± 1.18"],
      ["ChildPose", "108.173", "6.086 ± 0.028", "6.107 ± 0.029", "163.74 ± 0.78"]
    ]
  },
  configs: {
    caption: "Encoder and heatmap dimensions",
    headers: ["ChildPose encoder", "Input crop", "Tokens × dimensions", "Prefix token", "Heatmaps"],
    rows: [
      ["HRNet-W48", "384 × 288", "256 × 1024", "No", "64 × 64"],
      ["HRFormer-Base", "384 × 288", "256 × 1024", "No", "64 × 64"],
      ["ViTPose-Base", "256 × 192", "192 × 768", "No", "64 × 48"],
      ["Sapiens-0.3B", "1024 × 1024", "4097 × 1024", "Yes", "256 × 256"],
      ["Sapiens-0.6B", "1024 × 1024", "4097 × 1280", "Yes", "256 × 256"],
      ["Sapiens-1B", "1024 × 1024", "4097 × 1536", "Yes", "256 × 256"]
    ]
  },
  curriculum: {
    caption: "Staged training schedule",
    headers: ["Phase", "Trainable modules", "Memory", "Losses"],
    rows: [
      ["1.1", "Pose head", "Off", "Pose"],
      ["1.2", "Backbone and pose head", "Off", "Pose"],
      ["1.3", "Backbone, pose head and memory pathway", "Warmup", "Pose"],
      ["2", "Backbone, pose head and memory pathway", "On", "Pose + temporal"],
      ["3.1", "Age head", "On", "Age"],
      ["3.2", "All trainable branches", "On", "Pose + temporal + age"]
    ]
  },
  datasets: {
    headers: ["Dataset", "Age coverage", "Data", "Scope"],
    rows: [
      ["BabyPose", "Preterm neonates", "16 depth videos, 16,000 frames", "Single NICU, 12 limb joints"],
      ["In-Motion Poses", "Young infants", "1,424 RGB videos, 20,000 annotated frames", "Mostly supine GMA, 19 keypoints"],
      ["MINI-RGBD", "Infants up to ~7 months", "12 synthetic RGB-D sequences, 12,000 frames", "Limited appearance and motion diversity"],
      ["SyRIP", "Infants", "700 real and 1,000 synthetic images", "Image-based supervision"],
      ["Multiview Child Motor Development", "20–71 months", "339 children, three-view RGB videos", "Structured tasks in a controlled setup"],
      ["Children Pose", "Infancy to teenage years, plus adult references", "5,943 RGB clips, 25.6 hours, six sources", "Temporal COCO-17 annotations"]
    ]
  }
};

for (const container of document.querySelectorAll("[data-table]")) {
  const { caption, headers, rows, numericFrom = Infinity } = referenceTables[container.dataset.table];
  const table = document.createElement("table");
  const title = container.getAttribute("aria-labelledby");
  if (title) table.setAttribute("aria-labelledby", title);
  if (caption) table.createCaption().textContent = caption;
  const head = table.createTHead().insertRow();
  headers.forEach((label, index) => {
    appendCell(head, "th", label, index >= numericFrom ? "numeric" : "").scope = "col";
  });
  const body = table.createTBody();
  for (const values of rows) {
    const row = body.insertRow();
    appendCell(row, "th", values[0]).scope = "row";
    values.slice(1).forEach((value, index) => {
      appendCell(row, "td", value, index + 1 >= numericFrom ? "numeric" : "");
    });
  }
  container.append(table);
}

for (const link of document.querySelectorAll("[data-resource]")) {
  link.addEventListener("click", event => {
    if (!link.getAttribute("href").endsWith("-placeholder")) return;
    event.preventDefault();
    document.querySelector("#resource-status").textContent = link.dataset.resource + " link will be added at release.";
  });
}

const copyButton = document.querySelector("#copy-citation");
const copyLabel = copyButton.querySelector("span");
const copyStatus = document.querySelector("#copy-status");
const citation = document.querySelector("#bibtex");
let copyTimer;

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyLabel.textContent = "Copied";
    copyStatus.textContent = "BibTeX copied to clipboard.";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyLabel.textContent = "Copy"; }, 2200);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(citation);
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = "BibTeX selected. Use your keyboard to copy.";
  }
});
