
(() => {
  const resultsBox = document.getElementById("scan-results");
  const sortButtons = [...document.querySelectorAll(".sort-button")];
  const infoButton = document.getElementById("sort-info-button");
  const infoBox = document.getElementById("sort-info");

  let selectedEmoji = null;
  let arrivalCounter = 0;

  function sort() {
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

  function add(domain, emoji, index, number) {
    const row = document.createElement("div");
    row.className = "scan-result-row";
    row.dataset.emoji = emoji;
    row.dataset.index = String(index);
    row.dataset.arrival = String(arrivalCounter++);

    const domainText = document.createElement("span");
    domainText.className = "scan-result-domain";
    domainText.textContent = domain;

    const numberText = document.createElement("span");
    numberText.className = "scan-result-number";
    numberText.textContent = number;

    const icon = document.createElement("span");
    icon.className = "scan-result-emoji";
    icon.textContent = emoji;

    row.append(domainText, numberText, icon);
    resultsBox.appendChild(row);
    sort();
  }

  function reset() {
    resultsBox.replaceChildren();
    arrivalCounter = 0;
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

  sortButtons.forEach(button => {
    button.addEventListener("click", () => setSort(button.dataset.sort));
  });

  infoButton.addEventListener("click", () => {
    const opening = infoBox.hidden;
    infoBox.hidden = !opening;
    infoButton.setAttribute("aria-expanded", String(opening));
  });

  window.ScanResults = { add, reset, sort };
})();
