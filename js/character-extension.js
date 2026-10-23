
(() => {
  const app = window.ScannerApp;
  const { domainInput, characterSelector } = app.dom;

  const extendedPositions = new Set();
  let lastKnownName = app.getBaseName();

  function shiftPositions(set, index, direction) {
    const shifted = [...set].map(position => {
      if (direction === 1 && position >= index) return position + 1;
      if (direction === -1 && position > index) return position - 1;
      return position;
    });

    set.clear();
    shifted.forEach(position => set.add(position));
  }

  function addCharacter(atStart) {
    if (app.scanning) return;

    const name = app.getBaseName();
    const character = (app.getCharacters()[0] || "a").toLowerCase();

    if (!name || name.length >= 63) return;

    const index = atStart ? 0 : name.length;

    if (atStart) {
      shiftPositions(app.selectedPositions, 0, 1);
      shiftPositions(extendedPositions, 0, 1);
    }

    extendedPositions.add(index);

    domainInput.value = atStart
      ? character + name
      : name + character;

    lastKnownName = app.getBaseName();
    app.renderCharacterButtons();
  }

  function removeExtendedCharacter(index) {
    const name = app.getBaseName();

    if (!extendedPositions.has(index)) return;

    domainInput.value = name.slice(0, index) + name.slice(index + 1);

    extendedPositions.delete(index);
    shiftPositions(extendedPositions, index, -1);

    app.selectedPositions.delete(index);
    shiftPositions(app.selectedPositions, index, -1);

    lastKnownName = app.getBaseName();
    app.renderCharacterButtons();
  }

  // Manual input editing resets the added-letter markers.
  domainInput.addEventListener("input", () => {
    const currentName = app.getBaseName();

    if (currentName !== lastKnownName) {
      extendedPositions.clear();
      lastKnownName = currentName;
    }
  });

  app.renderCharacterButtons = function() {
    const name = app.getBaseName();
    characterSelector.replaceChildren();

    app.selectedPositions = new Set(
      [...app.selectedPositions].filter(index => index < name.length)
    );

    for (const position of [...extendedPositions]) {
      if (position >= name.length) {
        extendedPositions.delete(position);
      }
    }

    function createPlusButton(atStart) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "char-button char-plus";
      button.textContent = "+";
      button.setAttribute(
        "aria-label",
        atStart
          ? "Add a letter at the beginning"
          : "Add a letter at the end"
      );

      button.addEventListener("click", () => addCharacter(atStart));
      characterSelector.appendChild(button);
    }

    if (!name) {
      const hint = document.createElement("p");
      hint.className = "selector-hint";
      hint.textContent = "Enter a domain name to select characters.";
      characterSelector.appendChild(hint);
      app.updateButton();
      return;
    }

    createPlusButton(true);

    [...name].forEach((character, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "char-button";
      button.textContent = character;
      button.setAttribute(
        "aria-label",
        `Select ${character} at position ${index + 1}`
      );

      const isExtended = extendedPositions.has(index);

      if (isExtended) {
        button.classList.add("char-extended");
        button.title = "Click to select; click again to remove this added letter";
      }

      const syncButton = () => {
        const active = app.selectedPositions.has(index);
        button.classList.toggle("selected", active);
        button.setAttribute("aria-pressed", String(active));
      };

      button.addEventListener("click", () => {
        if (app.scanning) return;

        if (extendedPositions.has(index)) {
          if (app.selectedPositions.has(index)) {
            const confirmRemove = window.confirm(
              "Do you want to remove this added letter?"
            );

            if (confirmRemove) {
              removeExtendedCharacter(index);
            }

            return;
          }

          // First click: select the added letter.
          app.selectedPositions.add(index);
          syncButton();
          app.updateButton();

          const count = app.getTotal();
          app.dom.progressBox.textContent = count
            ? `${app.selectedPositions.size} position(s) selected. ${count.toLocaleString()} combinations.`
            : "Select character positions and a–z or 0–9.";

          return;
        }

        // Normal letters retain their existing select/deselect behavior.
        if (app.selectedPositions.has(index)) {
          app.selectedPositions.delete(index);
        } else {
          app.selectedPositions.add(index);
        }

        syncButton();
        app.updateButton();

        const count = app.getTotal();

        app.dom.progressBox.textContent = count
          ? `${app.selectedPositions.size} position(s) selected. ${count.toLocaleString()} combinations.`
          : "Select character positions and a–z or 0–9.";
      });

      syncButton();
      characterSelector.appendChild(button);
    });

    createPlusButton(false);
    app.updateButton();
  };
})();
