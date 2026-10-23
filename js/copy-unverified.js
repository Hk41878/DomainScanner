
(() => {
  const BATCH_SIZE = 1000;
  const container = document.getElementById("copy-unverified-tools");

  if (!container) return;

  const style = document.createElement("style");

  style.textContent = `
    #copy-unverified-tools {
      padding: 14px 0;
      border-bottom: 1px solid #374151;
    }

    .copy-unverified-heading {
      margin-bottom: 10px;
      font-weight: 700;
    }

    .copy-unverified-count {
      float: right;
      font-variant-numeric: tabular-nums;
    }

    .copy-unverified-buttons {
      display: grid;
      grid-template-columns: 1fr;
      gap: 7px;
      margin-top: 10px;
    }

    .copy-unverified-buttons button {
      width: 100%;
      padding: 9px 10px;
      border: 1px solid #475569;
      border-radius: 9px;
      background: #1f2937;
      color: #f8fafc;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .copy-unverified-buttons button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .copy-unverified-status {
      margin: 8px 0 0;
      color: #cbd5e1;
      font-size: 12px;
    }
  `;

  document.head.appendChild(style);

  const heading = document.createElement("div");
  heading.className = "copy-unverified-heading";
  heading.textContent = "Unable to verify";

  const count = document.createElement("span");
  count.className = "copy-unverified-count";

  const buttons = document.createElement("div");
  buttons.className = "copy-unverified-buttons";

  const status = document.createElement("p");
  status.className = "copy-unverified-status";
  status.setAttribute("aria-live", "polite");

  heading.appendChild(count);
  container.append(heading, buttons, status);

  function pad(value) {
    return String(value).padStart(4, "0");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const successful = document.execCommand("copy");
    textarea.remove();

    if (!successful) {
      throw new Error("Clipboard copy failed");
    }
  }

  function render() {
    if (!window.ScanResults) return;

    const domains = window.ScanResults.getUnableToVerifyDomains();

    count.textContent = `${domains.length} domains`;
    buttons.replaceChildren();
    status.textContent = "";

    if (domains.length === 0) {
      const message = document.createElement("p");
      message.className = "copy-unverified-status";
      message.textContent = "No domains to copy yet.";
      buttons.appendChild(message);
      return;
    }

    for (let start = 0; start < domains.length; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, domains.length);
      const batch = domains.slice(start, end);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent =
        `Copy ${pad(start + 1)}–${pad(end)}`;

      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Copying…";

        try {
          await copyText(batch.join("\n"));
          status.textContent =
            `Copied ${batch.length} domains to clipboard.`;
          button.textContent =
            `Copied ✓ ${pad(start + 1)}–${pad(end)}`;

          setTimeout(() => {
            button.textContent =
              `Copy ${pad(start + 1)}–${pad(end)}`;
            button.disabled = false;
          }, 1500);
        } catch (error) {
          console.error("Copy failed:", error);
          status.textContent =
            "Copy failed. Please allow clipboard access and try again.";
          button.disabled = false;
        }
      });

      buttons.appendChild(button);
    }
  }

  window.addEventListener("scanresultsupdated", render);
  render();
})();
