
(() => {
  const elapsedBox = document.getElementById("elapsed-time");
  const etaBox = document.getElementById("eta-time");

  let startedAt = 0;
  let elapsedBeforePause = 0;
  let completed = 0;
  let total = 0;
  let interval = null;
  let paused = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";

    seconds = Math.ceil(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
      .map(value => String(value).padStart(2, "0"))
      .join(":");
  }

  function getElapsed() {
    if (!startedAt) return elapsedBeforePause;

    return elapsedBeforePause +
      (paused ? 0 : (Date.now() - startedAt) / 1000);
  }

  function render() {
    const elapsed = getElapsed();
    elapsedBox.textContent = formatTime(elapsed);

    if (completed >= total && total > 0) {
      etaBox.textContent = "Complete";
    } else if (completed > 0 && elapsed > 0) {
      const rate = completed / elapsed;
      etaBox.textContent = formatTime((total - completed) / rate);
    } else {
      etaBox.textContent = "Calculating…";
    }
  }

  function start(count) {
    reset();
    total = count;
    startedAt = Date.now();
    paused = false;
    elapsedBox.textContent = "00:00:00";
    etaBox.textContent = "Calculating…";
    interval = setInterval(render, 1000);
  }

  function update(done) {
    completed = done;
    render();
  }

  function pause() {
    if (!startedAt || paused) return;

    elapsedBeforePause += (Date.now() - startedAt) / 1000;
    startedAt = 0;
    paused = true;
    render();
  }

  function resume() {
    if (!paused) return;

    startedAt = Date.now();
    paused = false;

    if (interval === null) {
      interval = setInterval(render, 1000);
    }

    render();
  }

  function stop() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  function finish() {
    if (startedAt) {
      elapsedBeforePause += (Date.now() - startedAt) / 1000;
    }

    startedAt = 0;
    paused = false;
    completed = total;
    render();
    stop();
  }

  function reset() {
    stop();
    startedAt = 0;
    elapsedBeforePause = 0;
    completed = 0;
    total = 0;
    paused = false;
    elapsedBox.textContent = "00:00:00";
    etaBox.textContent = "—";
  }

  window.ScanTimer = {
    start, update, pause, resume, finish, reset, stop
  };
})();
