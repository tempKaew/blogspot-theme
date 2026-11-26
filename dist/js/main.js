(function () {
  'use strict';

  document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggle-theme");
    const root = document.documentElement;

    if (toggleButton) {
      const updateAriaLabel = () => {
        const isLightMode = root.getAttribute("data-theme") === "light";
        toggleButton.setAttribute(
          "aria-label",
          isLightMode ? "Switch to dark mode" : "Switch to light mode",
        );
      };

      toggleButton.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        updateAriaLabel();
      });

      updateAriaLabel();
    }

    const searchInput = document.getElementById("searchInput");
    document.addEventListener("keydown", (event) => {
      if (!searchInput || event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) {
        return;
      }
      event.preventDefault();
      searchInput.focus();
    });

    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(value);
          button.setAttribute("data-copied", "true");
          window.setTimeout(() => button.removeAttribute("data-copied"), 1600);
        } catch (error) {
          console.error(error);
        }
      });
    });
  });

})();
