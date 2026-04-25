const STAGE_LABELS = {
  tradeQuery: "Trade query",
  vmCreate: "VM create",
  pricing: "Pricing",
  vmReclaim: "VM reclaim",
  resultIngest: "Result ingest",
  postProcess: "Post process",
};

const REQUEST_LABELS = {
  dataPrepare: "Data prepare",
  calculate: "Calculate",
  cleanup: "Clean up",
  validation: "Validation",
  cacheWarmup: "Cache warmup",
  publish: "Publish",
};

const STAGE_COLORS = {
  tradeQuery: "#3b82f6",
  vmCreate: "#14b8a6",
  pricing: "#f97316",
  vmReclaim: "#64748b",
  resultIngest: "#8b5cf6",
  postProcess: "#22c55e",
};

const jobs = [
  {
    id: "PRC-2026-0419",
    book: "Rates APAC",
    owner: "nightly-risk",
    region: "ap-shanghai",
    status: "warning",
    requestedAt: "21:08:14",
    instruments: 18420,
    vmType: "c7i.4xlarge",
    summary: {
      tradeQuery: 920,
      vmCreate: 2800,
      pricing: 9400,
      vmReclaim: 1200,
      resultIngest: 1500,
      postProcess: 1800,
    },
    requests: [
      {
        id: "REQ-8841",
        label: "USD swap curve shock",
        steps: { dataPrepare: 750, cacheWarmup: 420, calculate: 5200, validation: 240, cleanup: 360 },
      },
      {
        id: "REQ-8842",
        label: "CNH basis replay",
        steps: { dataPrepare: 640, calculate: 4100, validation: 290, publish: 210, cleanup: 340 },
      },
    ],
  },
  {
    id: "PRC-2026-0420",
    book: "Equity Delta One",
    owner: "intraday-pricer",
    region: "us-east-1",
    status: "completed",
    requestedAt: "21:11:02",
    instruments: 6410,
    vmType: "m7i.2xlarge",
    summary: {
      tradeQuery: 520,
      vmCreate: 1650,
      pricing: 3100,
      vmReclaim: 820,
      resultIngest: 760,
      postProcess: 940,
    },
    requests: [
      {
        id: "REQ-9177",
        label: "ETF basket price",
        steps: { dataPrepare: 310, calculate: 1720, validation: 180, publish: 160, cleanup: 210 },
      },
      {
        id: "REQ-9178",
        label: "Corporate action replay",
        steps: { dataPrepare: 410, calculate: 2180, validation: 260, cleanup: 190 },
      },
    ],
  },
  {
    id: "PRC-2026-0421",
    book: "Credit Exotics",
    owner: "scenario-grid",
    region: "eu-west-1",
    status: "failed",
    requestedAt: "21:18:39",
    instruments: 2280,
    vmType: "r7i.8xlarge",
    summary: {
      tradeQuery: 1100,
      vmCreate: 3900,
      pricing: 15200,
      vmReclaim: 2600,
      resultIngest: 420,
      postProcess: 310,
    },
    requests: [
      {
        id: "REQ-9403",
        label: "CDO tranche scenario",
        steps: { dataPrepare: 1080, cacheWarmup: 760, calculate: 12600, validation: 0, cleanup: 1440 },
      },
    ],
  },
  {
    id: "PRC-2026-0422",
    book: "Commodities",
    owner: "ad-hoc-analysis",
    region: "us-west-2",
    status: "completed",
    requestedAt: "21:24:51",
    instruments: 9180,
    vmType: "c7i.2xlarge",
    summary: {
      tradeQuery: 700,
      vmCreate: 1320,
      pricing: 4600,
      vmReclaim: 600,
      resultIngest: 980,
      postProcess: 1280,
    },
    requests: [
      {
        id: "REQ-9550",
        label: "Oil forward strip",
        steps: { dataPrepare: 520, calculate: 2900, validation: 220, publish: 180, cleanup: 250 },
      },
      {
        id: "REQ-9551",
        label: "Gas storage optionality",
        steps: { dataPrepare: 620, cacheWarmup: 310, calculate: 3500, validation: 320, cleanup: 280 },
      },
    ],
  },
];

let selectedJobId = jobs[0].id;
let selectedRequestIndex = 0;

export function getJobTotalTime(job) {
  return sumValues(job.summary);
}

export function getRequestTotalTime(request) {
  return sumValues(request.steps);
}

export function getTopBottlenecks(timings, limit = 3) {
  return Object.entries(timings)
    .map(([key, value]) => ({ key, label: STAGE_LABELS[key] ?? key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function sumValues(record) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function getHealthScore(job) {
  const total = getJobTotalTime(job);
  const pricingShare = job.summary.pricing / total;
  const penalty = total / 450 + pricingShare * 32 + (job.status === "failed" ? 18 : 0);
  return Math.max(42, Math.round(100 - penalty));
}

function getFilteredJobs() {
  const query = document.querySelector("#job-search").value.trim().toLowerCase();
  const status = document.querySelector("#status-filter").value;
  return jobs.filter((job) => {
    const haystack = `${job.id} ${job.book} ${job.owner} ${job.status}`.toLowerCase();
    return (status === "all" || job.status === status) && (!query || haystack.includes(query));
  });
}

function renderFleetMetrics(filteredJobs) {
  const totals = filteredJobs.map(getJobTotalTime).sort((a, b) => a - b);
  const average = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
  const p95 = totals.length ? totals[Math.ceil(totals.length * 0.95) - 1] : 0;
  const stageTotals = filteredJobs.reduce((acc, job) => {
    Object.entries(job.summary).forEach(([key, value]) => {
      acc[key] = (acc[key] ?? 0) + value;
    });
    return acc;
  }, {});
  const bottleneck = getTopBottlenecks(stageTotals, 1)[0]?.label ?? "-";

  document.querySelector("#metric-jobs").textContent = String(filteredJobs.length);
  document.querySelector("#metric-average").textContent = formatDuration(Math.round(average));
  document.querySelector("#metric-p95").textContent = formatDuration(p95);
  document.querySelector("#metric-bottleneck").textContent = bottleneck;
}

function renderJobList(filteredJobs) {
  const list = document.querySelector("#job-list");
  document.querySelector("#job-count").textContent = `${filteredJobs.length} shown`;
  list.innerHTML = "";

  filteredJobs.forEach((job) => {
    const button = document.createElement("button");
    button.className = `job-card ${job.id === selectedJobId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="status-dot ${job.status}"></span>
      <span>
        <strong>${job.id}</strong>
        <small>${job.book} / ${formatDuration(getJobTotalTime(job))}</small>
      </span>
      <b>${getHealthScore(job)}</b>
    `;
    button.addEventListener("click", () => {
      selectedJobId = job.id;
      selectedRequestIndex = 0;
      render();
    });
    list.append(button);
  });
}

function renderSelectedJob(job) {
  const total = getJobTotalTime(job);
  document.querySelector("#selected-owner").textContent = `${job.owner} / ${job.region}`;
  document.querySelector("#selected-title").textContent = `${job.id} - ${job.book}`;
  document.querySelector("#selected-meta").textContent =
    `${job.instruments.toLocaleString()} instruments priced on ${job.vmType} at ${job.requestedAt}`;
  document.querySelector("#selected-score").textContent = String(getHealthScore(job));
  document.querySelector("#selected-score").style.setProperty("--score", `${getHealthScore(job) * 3.6}deg`);
  document.querySelector("#timeline-total").textContent = `${formatDuration(total)} total`;
  document.querySelector("#run-status").textContent = job.status;

  renderStageStack(job, total);
  renderStageBars(job, total);
  renderBottlenecks(job, total);
  renderContext(job);
  renderRequestPicker(job);
  renderRequestBreakdown(job.requests[selectedRequestIndex]);
}

function renderStageStack(job, total) {
  const stack = document.querySelector("#stage-stack");
  stack.innerHTML = "";
  Object.entries(job.summary).forEach(([key, value]) => {
    const segment = document.createElement("div");
    segment.className = "stage-segment";
    segment.style.width = `${(value / total) * 100}%`;
    segment.style.background = STAGE_COLORS[key];
    segment.title = `${STAGE_LABELS[key]} ${formatDuration(value)}`;
    stack.append(segment);
  });
}

function renderStageBars(job, total) {
  const bars = document.querySelector("#stage-bars");
  bars.innerHTML = "";
  Object.entries(job.summary).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${STAGE_LABELS[key]}</span>
      <div class="bar-track"><div style="width: ${(value / total) * 100}%; background: ${STAGE_COLORS[key]}"></div></div>
      <strong>${formatDuration(value)}</strong>
    `;
    bars.append(row);
  });
}

function renderBottlenecks(job, total) {
  const list = document.querySelector("#bottleneck-list");
  list.innerHTML = "";
  getTopBottlenecks(job.summary, 3).forEach((step) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${step.label}</span>
      <strong>${formatDuration(step.value)}</strong>
      <small>${Math.round((step.value / total) * 100)}% of runtime</small>
    `;
    list.append(item);
  });
}

function renderContext(job) {
  const context = document.querySelector("#run-context");
  context.innerHTML = `
    <div><dt>VM type</dt><dd>${job.vmType}</dd></div>
    <div><dt>Region</dt><dd>${job.region}</dd></div>
    <div><dt>Requests</dt><dd>${job.requests.length}</dd></div>
    <div><dt>Instruments</dt><dd>${job.instruments.toLocaleString()}</dd></div>
  `;
}

function renderRequestPicker(job) {
  const picker = document.querySelector("#request-picker");
  picker.innerHTML = "";
  job.requests.forEach((request, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${request.id} - ${request.label}`;
    option.selected = index === selectedRequestIndex;
    picker.append(option);
  });
}

function renderRequestBreakdown(request) {
  const total = getRequestTotalTime(request);
  const breakdown = document.querySelector("#request-breakdown");
  const table = document.querySelector("#request-table");
  document.querySelector("#request-total").textContent = formatDuration(total);
  breakdown.innerHTML = "";
  table.innerHTML = "";

  Object.entries(request.steps).forEach(([key, value]) => {
    const share = total ? value / total : 0;
    const slice = document.createElement("div");
    slice.className = "request-slice";
    slice.style.height = `${Math.max(10, share * 160)}px`;
    slice.style.setProperty("--slice", `${Math.round(share * 100)}%`);
    slice.innerHTML = `<strong>${Math.round(share * 100)}%</strong><span>${REQUEST_LABELS[key] ?? key}</span>`;
    breakdown.append(slice);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${REQUEST_LABELS[key] ?? key}</td>
      <td>${formatDuration(value)}</td>
      <td>${Math.round(share * 100)}%</td>
    `;
    table.append(row);
  });
}

function render() {
  const filteredJobs = getFilteredJobs();
  if (!filteredJobs.some((job) => job.id === selectedJobId) && filteredJobs[0]) {
    selectedJobId = filteredJobs[0].id;
    selectedRequestIndex = 0;
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0] ?? jobs[0];
  renderFleetMetrics(filteredJobs);
  renderJobList(filteredJobs);
  renderSelectedJob(selectedJob);
}

if (typeof document !== "undefined") {
  document.querySelector("#job-search").addEventListener("input", render);
  document.querySelector("#status-filter").addEventListener("change", render);
  document.querySelector("#request-picker").addEventListener("change", (event) => {
    selectedRequestIndex = Number(event.target.value);
    const selectedJob = jobs.find((job) => job.id === selectedJobId);
    renderRequestBreakdown(selectedJob.requests[selectedRequestIndex]);
  });
  render();
}
