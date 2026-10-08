(() => {
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-nav-toggle]");
    if (toggle) {
      const menu = document.getElementById(toggle.getAttribute("aria-controls"));
      if (!menu) {
        console.error("The navigation menu referenced by the toggle is missing.");
        return;
      }

      const isOpen = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      return;
    }

    const link = event.target.closest("#navbarMenu a");
    if (!link || window.innerWidth > 1199) return;

    const menu = document.getElementById("navbarMenu");
    const menuToggle = document.querySelector("[data-nav-toggle]");
    if (menu) menu.classList.remove("open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  });
})();
