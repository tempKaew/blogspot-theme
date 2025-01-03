(function () {
  'use strict';

  const toggleButton = document.getElementById("toggle-theme");
  function updateAriaLabel() {
    const isLightMode = document.firstElementChild.getAttribute("data-theme") === "light";
    toggleButton.setAttribute("aria-label", isLightMode ? "Switch to dark mode" : "Switch to light mode");
  }
  toggleButton.addEventListener("click", () => {
    const currentTheme = document.firstElementChild.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.firstElementChild.setAttribute("data-theme", newTheme);
    updateAriaLabel();
  });
  updateAriaLabel();

})();
