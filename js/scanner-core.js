(() => {
  const app = window.ScannerApp = window.ScannerApp || {};
  app.dom = {
    domainInput: document.getElementById("domain"), extensionSelect: document.getElementById("extension"),
    characterSelector: document.getElementById("character-selector"), scanButton: document.getElementById("scan-button"),
    progressBox: document.getElementById("scan-progress"), includeLetters: document.getElementById("include-letters"),
    includeNumbers: document.getElementById("include-numbers"), pauseButton: document.getElementById("pause-button"),
    playButton: document.getElementById("play-button"), resetButton: document.getElementById("reset-button")
  };
  app.LETTERS = "abcdefghijklmnopqrstuvwxyz"; app.NUMBERS = "0123456789";
  app.selectedPositions = new Set(); app.scanning = false; app.paused = false;
  app.scanId = 0; app.nextIndex = 0; app.completed = 0; app.total = 0; app.startMode = "entered";
  const { characterSelector } = app.dom;
  app.startOptions = document.createElement("div"); app.startOptions.className = "scan-start-options";
  const heading = document.createElement("p"); heading.className = "scan-start-heading"; heading.textContent = "Where should scanning start?";
  const enteredLabel = document.createElement("label"); enteredLabel.className = "scan-start-option";
  app.enteredRadio = document.createElement("input"); app.enteredRadio.type = "radio"; app.enteredRadio.name = "scan-start-mode"; app.enteredRadio.value = "entered"; app.enteredRadio.checked = true;
  app.enteredText = document.createElement("span"); enteredLabel.append(app.enteredRadio, app.enteredText);
  const firstLabel = document.createElement("label"); firstLabel.className = "scan-start-option";
  app.firstRadio = document.createElement("input"); app.firstRadio.type = "radio"; app.firstRadio.name = "scan-start-mode"; app.firstRadio.value = "first";
  app.firstText = document.createElement("span"); firstLabel.append(app.firstRadio, app.firstText);
  app.startHint = document.createElement("p"); app.startHint.className = "scan-start-hint";
  app.startOptions.append(heading, enteredLabel, firstLabel, app.startHint);
  characterSelector.insertAdjacentElement("afterend", app.startOptions);
  app.getBaseName = function () {
    const input = app.dom.domainInput.value.trim().toLowerCase(); if (!input) return "";
    const match = input.match(/^(.+)\.([a-z]{2,})\.?$/i);
    if (match) { const option = [...app.dom.extensionSelect.options].find(item => item.value.toLowerCase() === match[2].toLowerCase()); if (option) return match[1]; }
    return input;
  };
  app.isValidName = name => name.length > 0 && name.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name);
  app.delay = ms => new Promise(resolve => setTimeout(resolve, ms));
})();
