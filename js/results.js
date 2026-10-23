
(() => {
  const resultsBox = document.getElementById("scan-results");
  const sortButtons = [...document.querySelectorAll(".sort-button")];
  const infoButton = document.getElementById("sort-info-button");
  const infoBox = document.getElementById("sort-info");

  let selectedEmoji = null;
  let arrivalCounter = 0;
  let retryProgress = null;
  const records = new Map();

  const groups = [
    { emoji: "❌", label: "DNS record found" },
    { emoji: "🍀", label: "RDAP: no domain record" },
    { emoji: "🟡", label: ".IT: no DNS records found" },
    { emoji: "⚪", label: "Unable to verify" }
  ];

  const RETRY_CONCURRENCY = 10;

  const style = document.createElement("style");
  style.textContent = `
    #scan-summary-launcher {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9998;
      border: 1px solid #475569;
      border-radius: 999px;
      padding: 11px 16px;
      background: #111827;
      color: #fff;
      font: inherit;
      font-weight: 650;
      box-shadow: 0 8px 28px #0005;
      cursor: pointer;
    }

    #scan-summary-panel {
      position: fixed;
      right: 18px;
      bottom: 76px;
      z-index: 9999;
      width: min(430px, calc(100vw - 28px));
      max-height: min(72vh, 620px);
      overflow: auto;
      padding: 18px;
      border: 1px solid #475569;
      border-radius: 16px;
      background: #111827;
      color: #f8fafc;
      box-shadow: 0 16px 48px #0008;
      font: 14px/1.45 system-ui, sans-serif;
    }

    #scan-summary-panel[hidden] {
      display: none;
    }

    #scan-summary-panel * {
      box-sizing: border-box;
    }

    .scan-summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .scan-summary-header h2 {
      font-size: 17px;
      margin: 0;
    }

    .scan-summary-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
    }

    .scan-summary-actions button,
    .scan-summary-group button {
      border: 1px solid #475569;
      border-radius: 9px;
      padding: 8px 11px;
      color: #f8fafc;
      background: #1f2937;
      font: inherit;
      cursor: pointer;
    }

    .scan-summary-actions button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .scan-summary-group {
      padding: 10px 0;
      border-bottom: 1px solid #374151;
    }

    .scan-summary-count {
      float: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }

    .scan-summary-domains {
      margin: 8px 0 0;
      padding-left: 24px;
      max-height: 120px;
      overflow: auto;
      color: #cbd5e1;
      overflow-wrap: anywhere;
    }

    .scan-summary-domains:empty {
      display: none;
    }

    .scan-summary-note {
      color: #cbd5e1;
      font-size: 12px;
      margin: 12px 0 0;
    }

    .scan-summary-close {
      font-size: 20px !important;
      line-height: 1;
      padding: 5px 9px !important;
    }

    @media (max-width: 480px) {
      #scan-summary-launcher {
        right: 12px;
        bottom: 12px;
      }

      #scan-summary-panel {
        right: 10px;
        bottom: 66px;
        width: calc(100vw - 20px);
      }
    }
  `;

  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.id = "scan-summary-launcher";
  launcher.type = "button";
  launcher.textContent = "Show Results";
  launcher.addEventListener("click", showPopup);
  document.body.appendChild(launcher);

  const panel = document.createElement("section");
  panel.id = "scan-summary-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", "Scan result summary");

  const header = document.createElement("div");
  header.className = "scan-summary-header";

  const heading = document.createElement("h2");
  heading.textContent = "Scan Results";

  const closeButton = document.createElement("button");
  closeButton.className = "scan-summary-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close results popup");
  closeButton.addEventListener("click", () => {
    panel.hidden = true;
  });

  header.append(heading, closeButton);

  const summaryBody = document.createElement("div");

  // Required by the separate copy-unverified.js feature.
  const copyTools = document.createElement("div");
  copyTools.id = "copy-unverified-tools";

  const note = document.createElement("p");
  note.className = "scan-summary-note";
  note.textContent =
    "Results are indicative. Confirm domain availability with a registrar.";

  const actions = document.createElement("div");
  actions.className = "scan-summary-actions";

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.textContent = "Check again (0)";
  retryButton.addEventListener("click", retryUnableToVerify);

  const closeAction = document.createElement("button");
  closeAction.type = "button";
  closeAction.textContent = "Close";
  closeAction.addEventListener("click", () => {
    panel.hidden = true;
  });

  actions.append(retryButton, closeAction);
  panel.append(header, summaryBody, copyTools, note, actions);
  document.body.appendChild(panel);

  function showPopup() {
    panel.hidden = false;
    renderSummary();
  }

  function sort() {
    if (!resultsBox) return;

    const rows = [...resultsBox.querySelectorAll(".scan-result-row")];

    rows.sort((a, b) => {
      if (selectedEmoji) {
        const aMatch = a.dataset.emoji === selectedEmoji;
        const bMatch = b.dataset.emoji === selectedEmoji;

        if (aMatch !== bMatch) return aMatch ? -1 : 1;
      }

      return Number(b.dataset.arrival) - Number(a.dataset.arrival);
    });

    rows.forEach(row => resultsBox.appendChild(row));
  }

  function renderRows() {
    if (!resultsBox) return;

    resultsBox.replaceChildren();

    [...records.values()].forEach(record => {
      const row = document.createElement("div");
      row.className = "scan-result-row";
      row.dataset.emoji = record.emoji;
      row.dataset.index = String(record.index);
      row.dataset.arrival = String(record.arrival);

      const domainText = document.createElement("span");
      domainText.className = "scan-result-domain";
      domainText.textContent = record.domain;

      const numberText = document.createElement("span");
      numberText.className = "scan-result-number";
      numberText.textContent = record.number;

      const icon = document.createElement("span");
      icon.className = "scan-result-emoji";
      icon.textContent = record.emoji;

      row.title = record.message || "";
      row.append(domainText, numberText, icon);
      resultsBox.appendChild(row);
    });

    sort();
  }

  function renderSummary() {
    summaryBody.replaceChildren();

    const counts = Object.fromEntries(
      groups.map(group => [group.emoji, 0])
    );

    records.forEach(record => {
      if (Object.prototype.hasOwnProperty.call(counts, record.emoji)) {
        counts[record.emoji]++;
      }
    });

    groups.forEach(group => {
      const section = document.createElement("div");
      section.className = "scan-summary-group";

      const label = document.createElement("div");
      label.textContent = `${group.emoji} ${group.label}`;

      const count = document.createElement("span");
      count.className = "scan-summary-count";
      count.textContent = String(counts[group.emoji]).padStart(4, "0");

      label.appendChild(count);
      section.appendChild(label);

      const matching = [...records.values()].filter(
        record => record.emoji === group.emoji
      );

      if (matching.length) {
        const list = document.createElement("ul");
        list.className = "scan-summary-domains";

        matching.slice(0, 100).forEach(record => {
          const item = document.createElement("li");
          item.textContent = record.domain;
          list.appendChild(item);
        });

        if (matching.length > 100) {
          const more = document.createElement("li");
          more.textContent = `…and ${matching.length - 100} more`;
          list.appendChild(more);
        }

        section.appendChild(list);
      }

      summaryBody.appendChild(section);
    });

    const unableCount = counts["⚪"];

    // Keep progress text visible while retry workers are running.
    retryButton.textContent = retryProgress
      ? `Checking ${retryProgress.completed}/${retryProgress.total}…`
      : `Check again (${unableCount})`;

    retryButton.disabled =
      unableCount === 0 || retryProgress !== null;

    launcher.textContent = `Show Results (${records.size})`;

    window.dispatchEvent(new CustomEvent("scanresultsupdated"));
  }

  function add(domain, emoji, index, number, result = {}) {
    const existing = records.get(index);

    records.set(index, {
      domain,
      emoji,
      index,
      number,
      message: result.message || "",
      type: result.type || "",
      arrival: existing ? existing.arrival : arrivalCounter++
    });

    renderRows();
    renderSummary();
  }

  function reset() {
    records.clear();
    arrivalCounter = 0;
    selectedEmoji = null;
    retryProgress = null;

    if (resultsBox) resultsBox.replaceChildren();

    sortButtons.forEach(button => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });

    renderSummary();
    panel.hidden = true;
  }

  function setSort(emoji) {
    selectedEmoji = selectedEmoji === emoji ? null : emoji;

    sortButtons.forEach(button => {
      const active = button.dataset.sort === selectedEmoji;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    sort();
  }

  async function retryUnableToVerify() {
    if (retryProgress !== null) return;

    const pending = [...records.values()].filter(
      record => record.emoji === "⚪"
    );

    if (!pending.length) return;

    retryProgress = {
      completed: 0,
      total: pending.length
    };

    renderSummary();

    let nextIndex = 0;

    async function retryWorker() {
      while (true) {
        const taskIndex = nextIndex++;

        if (taskIndex >= pending.length) return;

        const record = pending[taskIndex];

        try {
          // Force a fresh network check instead of using cached data.
          const result = await window.DomainChecker.check(
            record.domain,
            { force: true }
          );

          const current = records.get(record.index);

          // Update only if the record still exists and is still the same domain.
          if (current && current.domain === record.domain) {
            records.set(record.index, {
              ...current,
              emoji: result.emoji,
              message: result.message || "",
              type: result.type || ""
            });
          }
        } catch (error) {
          console.error("Retry failed:", record.domain, error);
        }

        retryProgress.completed++;

        renderRows();
        renderSummary();
      }
    }

    try {
      const workerCount = Math.min(
        RETRY_CONCURRENCY,
        pending.length
      );

      await Promise.all(
        Array.from({ length: workerCount }, () => retryWorker())
      );
    } finally {
      retryProgress = null;
      renderRows();
      renderSummary();
    }
  }

  sortButtons.forEach(button => {
    button.addEventListener("click", () => {
      setSort(button.dataset.sort);
    });
  });

  if (infoButton && infoBox) {
    infoButton.addEventListener("click", () => {
      const opening = infoBox.hidden;
      infoBox.hidden = !opening;
      infoButton.setAttribute("aria-expanded", String(opening));
    });
  }

  window.ScanResults = {
    add,
    reset,
    sort,
    showPopup,
    retryUnableToVerify,

    getUnableToVerifyDomains() {
      return [...records.values()]
        .filter(record => record.emoji === "⚪")
        .map(record => record.domain);
    }
  };
})();
