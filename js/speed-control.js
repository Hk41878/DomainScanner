
(() => {
  const buttons = [...document.querySelectorAll(".speed-button")];
  let speed = 1;

  function setSpeed(value) {
    speed = value;

    buttons.forEach(button => {
      const active = Number(button.dataset.speed) === speed;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const selected = Number(button.dataset.speed);
      setSpeed(speed === selected ? 1 : selected);
    });
  });

  window.SpeedControl = {
    getSpeed: () => speed,
    reset: () => setSpeed(1)
  };
})();
