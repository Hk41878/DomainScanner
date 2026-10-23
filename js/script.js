
(() => {
  const domainInput = document.getElementById("domain");
  const extensionInput = document.getElementById("extension-input");
  const extensionDot = document.getElementById("extension-dot");
  const extensionError = document.getElementById("extension-error");
  const extensionSelect = document.getElementById("extension");
  const statusBox = document.getElementById("status");
  const methodBox = document.getElementById("method");

  let debounceTimer;
  let requestId = 0;

  const dnsOnlyExtensions = new Set(["it"]);

  function showStatus(message, type = "muted") {
    statusBox.className = `status ${type}`;
    statusBox.textContent = message;
  }

  function updateMethod() {
    methodBox.textContent = dnsOnlyExtensions.has(extensionSelect.value)
      ? "DNS Check Only — RDAP is not enabled for this extension."
      : "DNS first, then RDAP if no DNS records are found.";
  }

  function extensionIsValid(value) {
    return [...extensionSelect.options].some(
      option => option.value.toLowerCase() === value.toLowerCase()
    );
  }

  function showExtension(show) {
    extensionInput.hidden = !show;
    extensionDot.hidden = !show;

    if (!show) {
      extensionInput.value = "";
      extensionInput.classList.remove("valid", "invalid");
      extensionError.hidden = true;
    }
  }

  function validateExtension() {
    const value = extensionInput.value.trim().toLowerCase();
    const valid = extensionIsValid(value);

    extensionInput.classList.toggle("invalid", value !== "" && !valid);
    extensionInput.classList.toggle("valid", value !== "" && valid);
    extensionError.hidden = value === "" || valid;

    if (!extensionError.hidden) {
      extensionError.textContent = "Invalid or unsupported extension.";
    }

    return valid;
  }

  function syncExtensionToSelector() {
    const value = extensionInput.value.trim().toLowerCase();

    if (extensionIsValid(value)) {
      extensionSelect.value = value;
      updateMethod();
      return true;
    }

    return false;
  }

  function getDomain() {
    const name = domainInput.value.trim().toLowerCase();

    if (!name) return null;

    let extension;

    if (!extensionInput.hidden) {
      extension = extensionInput.value.trim().toLowerCase();

      if (!extension || !extensionIsValid(extension)) return null;
    } else {
      extension = extensionSelect.value.toLowerCase();
    }

    const domain = `${name}.${extension}`;
    const labels = domain.split(".");
    const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

    if (
      labels.length < 2 ||
      labels.some(label => !validLabel.test(label)) ||
      domain.length > 253
    ) {
      return null;
    }

    return domain;
  }

  async function checkDomain(domain, id) {
    showStatus(`Checking ${domain}...`);

    try {
      const result = await window.DomainChecker.check(domain);

      if (id !== requestId) return;
      showStatus(result.message, result.type);
    } catch {
      if (id !== requestId) return;
      showStatus("Unable to verify right now.", "muted");
    }
  }

  function handleInput() {
    clearTimeout(debounceTimer);
    const id = ++requestId;

    updateMethod();

    if (!domainInput.value.trim()) {
      showStatus("Enter a domain name to start checking.");
      return;
    }

    if (!extensionInput.hidden) {
      const value = extensionInput.value.trim();

      if (!value) {
        showStatus("Enter a domain extension.");
        return;
      }

      if (!validateExtension()) {
        showStatus("Invalid or unsupported extension.", "bad");
        return;
      }

      syncExtensionToSelector();
    }

    const domain = getDomain();

    if (!domain) {
      showStatus("Enter a valid domain name.", "bad");
      return;
    }

    showStatus("Waiting...");
    debounceTimer = setTimeout(() => checkDomain(domain, id), 500);
  }

  function openExtension(value = "") {
    showExtension(true);
    extensionInput.value = value.toLowerCase();
    validateExtension();
    extensionInput.focus();
    extensionInput.setSelectionRange(
      extensionInput.value.length,
      extensionInput.value.length
    );
  }

  // Typing or pasting a complete domain into the name field.
  domainInput.addEventListener("input", () => {
    const value = domainInput.value.trim().toLowerCase();

    if (value.includes(".")) {
      const lastDot = value.lastIndexOf(".");
      const name = value.slice(0, lastDot);
      const extension = value.slice(lastDot + 1);

      domainInput.value = name;
      openExtension(extension);
    }

    handleInput();
  });

  // Pressing "." opens the extension field.
  domainInput.addEventListener("keydown", event => {
    if (event.key === "." && !extensionInput.hidden) {
      event.preventDefault();
      extensionInput.focus();
    }
  });

  extensionInput.addEventListener("input", () => {
    extensionInput.value = extensionInput.value
      .toLowerCase()
      .replace(/^\./, "");

    validateExtension();
    syncExtensionToSelector();
    handleInput();

    // If the last extension character was deleted, return to one field.
    if (extensionInput.value === "") {
      showExtension(false);
      domainInput.focus();
      handleInput();
    }
  });

  extensionInput.addEventListener("keydown", event => {
    if (event.key === "Backspace" && extensionInput.value === "") {
      event.preventDefault();
      showExtension(false);
      domainInput.focus();
      handleInput();
    }

    if (event.key === "Escape") {
      showExtension(false);
      domainInput.focus();
      handleInput();
    }
  });

  // Changing the dropdown also updates the visible extension field.
  extensionSelect.addEventListener("change", () => {
    if (!extensionInput.hidden) {
      extensionInput.value = extensionSelect.value;
      validateExtension();
    }

    handleInput();
  });

  updateMethod();
})();
