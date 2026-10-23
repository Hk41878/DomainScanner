
(() => {
  const domainInput = document.getElementById("domain");
  const extensionSelect = document.getElementById("extension");
  const characterSelector = document.getElementById("character-selector");
  const scanButton = document.getElementById("scan-button");
  const progressBox = document.getElementById("scan-progress");
  const includeLetters = document.getElementById("include-letters");
  const includeNumbers = document.getElementById("include-numbers");

  const pauseButton = document.getElementById("pause-button");
  const playButton = document.getElementById("play-button");
  const resetButton = document.getElementById("reset-button");

  const LETTERS = "abcdefghijklmnopqrstuvwxyz";
  const NUMBERS = "0123456789";

  let selectedPositions = new Set();
  let scanning = false;
  let paused = false;
  let scanId = 0;
  let nextIndex = 0;
  let completed = 0;
  let total = 0;
  let currentDomain = "";
  let currentExtension = "";
  let startMode = "entered";

  // Create the scan-start choices without changing index.html.
  const startOptions = document.createElement("div");
  startOptions.className = "scan-start-options";

  const startHeading = document.createElement("p");
  startHeading.className = "scan-start-heading";
  startHeading.textContent = "Where should scanning start?";

  const enteredLabel = document.createElement("label");
  enteredLabel.className = "scan-start-option";

  const enteredRadio = document.createElement("input");
  enteredRadio.type = "radio";
  enteredRadio.name = "scan-start-mode";
  enteredRadio.value = "entered";
  enteredRadio.checked = true;

  const enteredText = document.createElement("span");

  enteredLabel.append(enteredRadio, enteredText);

  const firstLabel = document.createElement("label");
  firstLabel.className = "scan-start-option";

  const firstRadio = document.createElement("input");
  firstRadio.type = "radio";
  firstRadio.name = "scan-start-mode";
  firstRadio.value = "first";

  const firstText = document.createElement("span");

  firstLabel.append(firstRadio, firstText);

  const startHint = document.createElement("p");
  startHint.className = "scan-start-hint";

  startOptions.append(
    startHeading,
    enteredLabel,
    firstLabel,
    startHint
  );

  characterSelector.insertAdjacentElement("afterend", startOptions);

  function getBaseName() {
    // The new UI stores the name and extension separately.
    // Also support a full domain pasted into the name input.
    const input = domainInput.value.trim().toLowerCase();
    if (!input) return "";

    const match = input.match(/^(.+)\.([a-z]{2,})\.?$/i);

    if (match) {
      const option = [...extensionSelect.options].find(
        item => item.value.toLowerCase() === match[2].toLowerCase()
      );

      if (option) return match[1];
    }

    return input;
  }

  function isValidName(name) {
    return name.length > 0 &&
      name.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name);
  }

  function getCharacters() {
    let characters = "";
    if (includeLetters.checked) characters += LETTERS;
    if (includeNumbers.checked) characters += NUMBERS;
    return characters;
  }

  function getStartingName(name, characters, positions) {
    const chars = [...name];

    if (startMode === "first" && characters.length) {
      positions.forEach(position => {
        chars[position] = characters[0];
      });
    }

    return chars.join("");
  }

  function getTotal() {
    const name = getBaseName();
    const characters = getCharacters();
    const positions = [...selectedPositions].sort((a, b) => a - b);

    if (!name || !characters || !positions.length) return 0;

    const combinations = characters.length ** positions.length;

    // Starting from the first combination scans the full range.
    if (startMode === "first") {
      return combinations;
    }

    const chars = [...name];
    const indices = positions.map(position =>
      characters.indexOf(chars[position])
    );

    // If the entered characters are outside the chosen character set,
    // check the exact entered name first, then every generated combination.
    if (indices.some(index => index < 0)) {
      return combinations + 1;
    }

    let rank = 0;

    indices.forEach(index => {
      rank = rank * characters.length + index;
    });

    // Exact entered domain plus all following combinations.
    return combinations - rank;
  }

  function updateStartOptions() {
    const name = getBaseName();
    const extension = extensionSelect.value.toLowerCase();
    const characters = getCharacters();
    const positions = [...selectedPositions].sort((a, b) => a - b);

    const canChoose = Boolean(
      name && characters && positions.length && isValidName(name)
    );

    enteredRadio.disabled = scanning || !canChoose;
    firstRadio.disabled = scanning || !canChoose;

    const enteredName = name
      ? `${name}.${extension}`
      : "your-domain.com";

    const firstName = name && characters && positions.length
      ? `${getStartingName(name, characters, positions)}.${extension}`
      : "first-combination.com";

    enteredText.textContent =
      `Entered domain (${enteredName}) — continue forward from your current characters.`;

    firstText.textContent =
      `First combination (${firstName}) — start selected positions from "${characters[0] || "a"}".`;

    startHint.textContent = startMode === "entered"
      ? "The entered domain is checked first. Scanning then continues forward without restarting from earlier combinations."
      : "Selected positions start at the first character in your chosen set, then scan forward through the combinations.";

    enteredRadio.checked = startMode === "entered";
    firstRadio.checked = startMode === "first";
  }

  function updateButton() {
    const count = getTotal();

    scanButton.textContent = `Auto Check ${count.toLocaleString()}`;
    scanButton.disabled =
      scanning || !count || !isValidName(getBaseName());

    updateStartOptions();
  }

  function updateActionButtons() {
    pauseButton.disabled = !scanning || paused;
    playButton.disabled = !scanning || !paused;
    resetButton.disabled = !scanning;
  }

  function renderCharacterButtons() {
    const name = getBaseName();
    characterSelector.replaceChildren();

    selectedPositions = new Set(
      [...selectedPositions].filter(index => index < name.length)
    );

    if (!name) {
      const hint = document.createElement("p");
      hint.className = "selector-hint";
      hint.textContent = "Enter a domain name to select characters.";
      characterSelector.appendChild(hint);
      updateButton();
      return;
    }

    [...name].forEach((character, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "char-button";
      button.textContent = character;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute(
        "aria-label",
        `Select ${character} at position ${index + 1}`
      );

      function syncButton() {
        const active = selectedPositions.has(index);
        button.classList.toggle("selected", active);
        button.setAttribute("aria-pressed", String(active));
      }

      button.addEventListener("click", () => {
        if (scanning) return;

        if (selectedPositions.has(index)) {
          selectedPositions.delete(index);
        } else {
          selectedPositions.add(index);
        }

        syncButton();
        updateButton();

        const count = getTotal();
        progressBox.textContent = count
          ? `${selectedPositions.size} position(s) selected. ${count.toLocaleString()} combinations.`
          : "Select character positions and a–z or 0–9.";
      });

      syncButton();
      characterSelector.appendChild(button);
    });

    updateButton();
    progressBox.textContent = "Select one or more character positions.";
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function* generateVariants(name, positions, characters) {
    const chars = [...name];

    // Option 2: start from the first character in the selected set.
    if (startMode === "first") {
      positions.forEach(position => {
        chars[position] = characters[0];
      });

      const indices = positions.map(() => 0);

      while (true) {
        yield chars.join("");

        let carry = true;

        for (let i = positions.length - 1; i >= 0 && carry; i--) {
          indices[i]++;

          if (indices[i] >= characters.length) {
            indices[i] = 0;
          } else {
            carry = false;
          }
        }

        if (carry) return;

        positions.forEach((position, i) => {
          chars[position] = characters[indices[i]];
        });
      }
    }

    // Option 1: check the exact entered name first.
    yield name;

    const original = [...name];
    const indices = positions.map(position =>
      characters.indexOf(original[position])
    );

    if (indices.some(index => index < 0)) {
      const working = [...name];

      function* build(depth) {
        if (depth === positions.length) {
          yield working.join("");
          return;
        }

        const position = positions[depth];

        for (const character of characters) {
          working[position] = character;
          yield* build(depth + 1);
        }

        working[position] = original[position];
      }

      yield* build(0);
      return;
    }

    // Continue forward without wrapping around to earlier combinations.
    while (true) {
      let carry = true;

      for (let i = positions.length - 1; i >= 0 && carry; i--) {
        indices[i]++;

        if (indices[i] >= characters.length) {
          indices[i] = 0;
        } else {
          carry = false;
        }
      }

      if (carry) return;

      positions.forEach((position, i) => {
        chars[position] = characters[indices[i]];
      });

      yield chars.join("");
    }
  }

  function setInputsDisabled(disabled) {
    domainInput.disabled = disabled;
    extensionSelect.disabled = disabled;
    includeLetters.disabled = disabled;
    includeNumbers.disabled = disabled;
    enteredRadio.disabled = disabled;
    firstRadio.disabled = disabled;
  }

  function resetScan(message = "Scan reset.") {
    if (!scanning) return;

    scanId++;
    scanning = false;
    paused = false;
    nextIndex = 0;
    completed = 0;
    total = 0;

    setInputsDisabled(false);
    window.ScanResults.reset();
    window.ScanTimer.reset();

    progressBox.textContent = message;
    updateButton();
    updateActionButtons();
  }

  async function startScan() {
    if (scanning) return;

    const name = getBaseName();
    const extension = extensionSelect.value.toLowerCase();
    const characters = getCharacters();
    const positions = [...selectedPositions].sort((a, b) => a - b);

    if (!isValidName(name)) {
      progressBox.textContent = "Enter a valid domain name first.";
      return;
    }

    if (!positions.length || !characters.length) {
      progressBox.textContent = "Select positions and a character set.";
      return;
    }

    const domainCount = getTotal();

    if (domainCount > 10000) {
      const proceed = window.confirm(
        `This scan will check ${domainCount.toLocaleString()} domains. It may take a long time and send many requests. Continue?`
      );

      if (!proceed) return;
    }

    scanning = true;
    paused = false;
    scanId++;
    const thisScan = scanId;

    nextIndex = 0;
    completed = 0;
    total = domainCount;
    currentDomain = name;
    currentExtension = extension;

    setInputsDisabled(true);
    window.ScanResults.reset();
    window.ScanTimer.start(total);
    updateButton();
    updateActionButtons();

    const domainList = [...generateVariants(name, positions, characters)]
      .map(variant => `${variant}.${extension}`);

    total = domainList.length;
    window.ScanTimer.start(total);

    progressBox.textContent =
      `Starting at ${domainList[0]} — 0/${total.toLocaleString()}`;

    async function worker(workerId) {
      while (thisScan === scanId) {
        while (paused && thisScan === scanId) {
          await delay(100);
        }

        if (thisScan !== scanId || nextIndex >= domainList.length) return;

        if (workerId >= window.SpeedControl.getSpeed()) {
          await delay(80);
          continue;
        }

        const index = nextIndex++;
        const domain = domainList[index];

        const result = await window.DomainChecker.check(domain);

        if (thisScan !== scanId) return;

        window.ScanResults.add(
          domain,
          result.emoji,
          index,
          String(index + 1).padStart(
            Math.max(3, String(total).length),
            "0"
          )
        );

        completed++;
        window.ScanTimer.update(completed);

        progressBox.textContent =
          `${paused ? "Paused" : "Checked"} ${completed.toLocaleString()}/${total.toLocaleString()} — ${domain}`;
      }
    }

    try {
      await Promise.all(
        Array.from({ length: 10 }, (_, index) => worker(index))
      );

      if (thisScan !== scanId) return;

      window.ScanTimer.finish();
      progressBox.textContent =
        `Scan complete: ${completed.toLocaleString()}/${total.toLocaleString()} domains checked.`;
    } catch (error) {
      if (thisScan !== scanId) return;

      console.error("Bulk scan error:", error);
      window.ScanTimer.stop();
      progressBox.textContent =
        `Scan stopped after ${completed.toLocaleString()}/${total.toLocaleString()} domains.`;
    } finally {
      if (thisScan === scanId) {
        scanning = false;
        paused = false;
        setInputsDisabled(false);
        updateButton();
        updateActionButtons();
      }
    }
  }

  function pauseScan() {
    if (!scanning || paused) return;

    paused = true;
    window.ScanTimer.pause();
    progressBox.textContent =
      `Paused at ${completed.toLocaleString()}/${total.toLocaleString()}.`;
    updateActionButtons();
  }

  function playScan() {
    if (!scanning || !paused) return;

    paused = false;
    window.ScanTimer.resume();
    progressBox.textContent =
      `Resuming: ${completed.toLocaleString()}/${total.toLocaleString()}.`;
    updateActionButtons();
  }

  domainInput.addEventListener("input", () => {
    if (scanning) return;

    selectedPositions.clear();
    window.ScanResults.reset();
    window.ScanTimer.reset();
    renderCharacterButtons();
  });

  extensionSelect.addEventListener("change", () => {
    if (scanning) return;

    window.ScanResults.reset();
    window.ScanTimer.reset();
    updateButton();
  });

  enteredRadio.addEventListener("change", () => {
    if (scanning || !enteredRadio.checked) return;
    startMode = "entered";
    updateButton();
  });

  firstRadio.addEventListener("change", () => {
    if (scanning || !firstRadio.checked) return;
    startMode = "first";
    updateButton();
  });

  includeLetters.addEventListener("change", updateButton);
  includeNumbers.addEventListener("change", updateButton);
  scanButton.addEventListener("click", startScan);
  pauseButton.addEventListener("click", pauseScan);
  playButton.addEventListener("click", playScan);
  resetButton.addEventListener("click", () => resetScan());

  renderCharacterButtons();
  updateActionButtons();
})();
