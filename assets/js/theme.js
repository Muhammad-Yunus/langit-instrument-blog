(function () {
  var root = document.documentElement;
  var storageKey = "langit-theme";
  var themeMeta = document.getElementById("themeColorMeta");

  function readStored() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function preferredTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);

    var toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      var isLight = next === "light";
      toggle.setAttribute("aria-label", isLight ? "Aktifkan tema gelap" : "Aktifkan tema terang");
      toggle.setAttribute("title", isLight ? "Tema gelap" : "Tema terang");
      toggle.setAttribute("aria-pressed", isLight ? "true" : "false");
    }

    if (themeMeta) {
      themeMeta.setAttribute("content", next === "light" ? "#f4f5ec" : "#101108");
    }
  }

  function save(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      /* storage may be unavailable */
    }
    apply(theme);
  }

  apply(readStored() || root.getAttribute("data-theme") || preferredTheme());

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-theme-toggle]");
    if (!button) {
      return;
    }
    save(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  });

  window.addEventListener("storage", function (event) {
    if (event.key === storageKey && event.newValue) {
      apply(event.newValue);
    }
  });

  var media = window.matchMedia("(prefers-color-scheme: light)");
  if (media.addEventListener) {
    media.addEventListener("change", function (event) {
      if (!readStored()) {
        apply(event.matches ? "light" : "dark");
      }
    });
  }

  window.LangitTheme = {
    get: function () {
      return root.getAttribute("data-theme") || "dark";
    },
    set: save
  };
})();
