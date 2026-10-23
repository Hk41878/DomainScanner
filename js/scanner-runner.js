
(() => {
  const app = window.ScannerApp;

  const {
    domainInput,
    extensionSelect,
    includeLetters,
    includeNumbers,
    pauseButton,
    playButton,
    resetButton,
    progressBox
  } = app.dom;

  app.setInputsDisabled = function(disabled) {
    domainInput.disabled = disabled;
    extensionSelect.disabled = disabled;
    includeLetters.disabled = disabled;
    includeNumbers.disabled = disabled;
    app.enteredRadio.disabled = disabled;
    app.firstRadio.disabled = disabled;
  };

  app.resetScan = function(message = "Scan reset.") {
    if (!app.scanning) return;

    app.scanId++;
    app.scanning = false;
    app.paused = false;
    app.nextIndex = 0;
    app.completed = 0;
    app.total = 0;

    app.setInputsDisabled(false);
    window.ScanResults.reset();
    window.ScanTimer.reset();

    progressBox.textContent = message;

    app.updateButton();
    app.updateActionButtons();
  };

  app.startScan = async function() {
    if (app.scanning) return;

    const name = app.getBaseName();
    const extension = extensionSelect.value.toLowerCase();
    const characters = app.getCharacters();
    const positions = [...app.selectedPositions].sort(
      (a, b) => a - b
    );

    if (!app.isValidName(name)) {
      progressBox.textContent = "Enter a valid domain name first.";
      return;
    }

    if (!positions.length || !characters.length) {
      progressBox.textContent = "Select positions and a character set.";
      return;
    }

    const domainCount = app.getTotal();

    if (domainCount > 10000) {
      const proceed = window.confirm(
        `This scan will check ${domainCount.toLocaleString()} domains. It may take a long time and send many requests. Continue?`
      );

      if (!proceed) return;
    }

    app.scanning = true;
    app.paused = false;
    app.scanId++;

    const thisScan = app.scanId;

    app.nextIndex = 0;
    app.completed = 0;
    app.total = domainCount;

    app.setInputsDisabled(true);
    window.ScanResults.reset();

    app.updateButton();
    app.updateActionButtons();

    const domainList = [
      ...app.generateVariants(name, positions, characters)
    ].map(variant => `${variant}.${extension}`);

    app.total = domainList.length;
    window.ScanTimer.start(app.total);

    progressBox.textContent =
      `Starting at ${domainList[0]} — 0/${app.total.toLocaleString()}`;

    async function worker(workerId) {
      while (thisScan === app.scanId) {
        while (app.paused && thisScan === app.scanId) {
          await app.delay(100);
        }

        if (
          thisScan !== app.scanId ||
          app.nextIndex >= domainList.length
        ) {
          return;
        }

        if (workerId >= window.SpeedControl.getSpeed()) {
          await app.delay(80);
          continue;
        }

        const index = app.nextIndex++;
        const domain = domainList[index];
        const result = await window.DomainChecker.check(domain);

        if (thisScan !== app.scanId) return;

        window.ScanResults.add(
          domain,
          result.emoji,
          index,
          String(index + 1).padStart(
            Math.max(3, String(app.total).length),
            "0"
          ),
          result
        );

        app.completed++;
        window.ScanTimer.update(app.completed);

        progressBox.textContent =
          `${app.paused ? "Paused" : "Checked"} ${app.completed.toLocaleString()}/${app.total.toLocaleString()} — ${domain}`;
      }
    }

    try {
      await Promise.all(
        Array.from({ length: 20 }, (_, index) => worker(index))
      );

      if (thisScan !== app.scanId) return;

      window.ScanTimer.finish();

      progressBox.textContent =
        `Scan complete: ${app.completed.toLocaleString()}/${app.total.toLocaleString()} domains checked.`;

      window.ScanResults.showPopup();
    } catch (error) {
      if (thisScan !== app.scanId) return;

      console.error("Bulk scan error:", error);
      window.ScanTimer.stop();

      progressBox.textContent =
        `Scan stopped after ${app.completed.toLocaleString()}/${app.total.toLocaleString()} domains.`;

      window.ScanResults.showPopup();
    } finally {
      if (thisScan === app.scanId) {
        app.scanning = false;
        app.paused = false;

        app.setInputsDisabled(false);
        app.updateButton();
        app.updateActionButtons();
      }
    }
  };

  app.pauseScan = function() {
    if (!app.scanning || app.paused) return;

    app.paused = true;
    window.ScanTimer.pause();

    progressBox.textContent =
      `Paused at ${app.completed.toLocaleString()}/${app.total.toLocaleString()}.`;

    app.updateActionButtons();
    window.ScanResults.showPopup();
  };

  app.playScan = function() {
    if (!app.scanning || !app.paused) return;

    app.paused = false;
    window.ScanTimer.resume();

    progressBox.textContent =
      `Resuming: ${app.completed.toLocaleString()}/${app.total.toLocaleString()}.`;

    app.updateActionButtons();
  };

  app.dom.scanButton.addEventListener("click", app.startScan);

  pauseButton.addEventListener("click", app.pauseScan);
  playButton.addEventListener("click", app.playScan);

  resetButton.addEventListener("click", () => {
    app.resetScan();
  });
})();
