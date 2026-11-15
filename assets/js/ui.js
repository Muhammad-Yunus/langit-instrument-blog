(function () {
  var header = document.getElementById("siteHeader");
  var nav = document.getElementById("primaryNav");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var toast = document.getElementById("toast");
  var toastTimer = null;
  var observed = new WeakSet();
  var revealObserver = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) {
      return "";
    }
    var date = new Date(iso);
    if (isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function articleUrl(slug) {
    return "article.html?slug=" + encodeURIComponent(slug);
  }

  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  function toastMessage(message) {
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function setMenu(open) {
    if (!header || !navToggle) {
      return;
    }
    header.classList.toggle("is-menu-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    document.body.classList.toggle("no-scroll", open && window.innerWidth <= 960);
  }

  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      setMenu(!header.classList.contains("is-menu-open"));
    });
  }

  if (nav) {
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });
  }

  document.addEventListener("click", function (event) {
    if (!header || !header.classList.contains("is-menu-open")) {
      return;
    }
    if (nav && nav.contains(event.target)) {
      return;
    }
    if (navToggle && navToggle.contains(event.target)) {
      return;
    }
    setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 960) {
      setMenu(false);
    }
  });

  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
  }

  function observeReveals(scope) {
    var nodes = (scope || document).querySelectorAll(".reveal");
    Array.prototype.forEach.call(nodes, function (node) {
      if (observed.has(node) || node.classList.contains("is-visible")) {
        return;
      }
      observed.add(node);
      if (revealObserver) {
        revealObserver.observe(node);
      } else {
        node.classList.add("is-visible");
      }
    });
  }

  observeReveals(document);

  var navLinks = Array.prototype.filter.call(
    document.querySelectorAll(".nav__link[href^='#']"),
    function (link) {
      return link.getAttribute("href").indexOf("#") === 0;
    }
  );

  if (navLinks.length && "IntersectionObserver" in window) {
    var sectionLinks = new Map();
    navLinks.forEach(function (link) {
      var section = document.getElementById(link.getAttribute("href").slice(1));
      if (section) {
        sectionLinks.set(section, link);
      }
    });

    if (sectionLinks.size) {
      var visibleSections = new Set();

      var activate = function (link) {
        navLinks.forEach(function (item) {
          item.classList.toggle("is-active", item === link);
        });
      };

      var navObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              visibleSections.add(entry.target);
            } else {
              visibleSections.delete(entry.target);
            }
          });

          var best = null;
          visibleSections.forEach(function (section) {
            if (!best || section.offsetTop > best.offsetTop) {
              best = section;
            }
          });

          activate(best ? sectionLinks.get(best) : null);
        },
        { rootMargin: "-40% 0px -52% 0px" }
      );

      sectionLinks.forEach(function (link, section) {
        navObserver.observe(section);
      });
    }
  }

  var backTop = document.querySelector("[data-back-top]");
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener(
      "scroll",
      function () {
        backTop.classList.toggle("is-visible", window.scrollY > 560);
      },
      { passive: true }
    );
  }

  var year = document.getElementById("year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  window.LangitUI = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    articleUrl: articleUrl,
    refreshIcons: refreshIcons,
    toast: toastMessage,
    observeReveals: observeReveals,
    fallbackCover: "assets/img/banner.png",
    whatsapp: "https://wa.me/6281338327438?text=Halo%20Langit%20Instrument%2C%20saya%20ingin%20berkonsultasi%20mengenai%20proyek%20riset%20dan%20teknologi."
  };
})();
