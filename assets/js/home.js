(function () {
  var articles = (window.LANGIT_ARTICLES || []).slice();
  var videos = (window.LANGIT_VIDEOS || []).slice();
  var UI = window.LangitUI;
  var esc = UI.escapeHtml;
  var fallbackCover = UI.fallbackCover;

  articles.sort(function (a, b) {
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  function coverOf(article) {
    return article.cover || fallbackCover;
  }

  function tagList(categories, limit) {
    return (categories || [])
      .slice(0, limit || 3)
      .map(function (category) {
        return '<span class="tag">' + esc(category) + "</span>";
      })
      .join("");
  }

  var categoryLabels = {
    fpga: "FPGA",
    iot: "IoT",
    ai: "AI",
    odc: "ODC",
    "risc-v": "RISC-V",
    am335x: "AM335x",
    esp32: "ESP32",
    si5351: "Si5351",
    opengl: "OpenGL",
    opencl: "OpenCL",
    gstreamer: "GStreamer",
    arm64: "ARM64",
    "x96-max": "X96 Max",
    "identity-management": "Identity Management",
    "entra-id": "Entra ID",
    "open-source-hardware": "Open Source Hardware",
    "hardware-hacking": "Hardware Hacking",
    "generative-ai-tools": "Generative AI Tools",
    "generative-ai-use-cases": "Generative AI Use Cases",
    "generative-ai-solution": "Generative AI Solution",
    "code-composer-studio": "Code Composer Studio",
    "beaglebone-black": "BeagleBone Black",
    "raspberry-pi": "Raspberry Pi",
    "ham-radio": "Ham Radio",
    "signal-generator": "Signal Generator"
  };

  function prettyCategory(category) {
    if (categoryLabels[category]) {
      return categoryLabels[category];
    }
    var text = String(category || "").replace(/-/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function featureTemplate(article) {
    return (
      '<a class="hl-feature reveal" href="' +
      UI.articleUrl(article.slug) +
      '">' +
      '<img class="hl-feature__img" src="' +
      esc(coverOf(article)) +
      '" alt="" loading="lazy" decoding="async">' +
      '<span class="hl-feature__shade" aria-hidden="true"></span>' +
      '<span class="hl-feature__arrow"><i data-lucide="arrow-up-right"></i></span>' +
      '<div class="hl-feature__body">' +
      '<div class="article-card__tags"><span class="tag tag--warn">Highlight</span>' +
      tagList(article.categories, 2) +
      "</div>" +
      "<h3>" +
      esc(article.title) +
      "</h3>" +
      "<p>" +
      esc(article.excerpt) +
      "</p>" +
      '<div class="hl-meta"><span><i data-lucide="calendar"></i>' +
      esc(UI.formatDate(article.publishedAt)) +
      '</span><span><i data-lucide="clock"></i>' +
      esc(String(article.readingTime || 1)) +
      " mnt baca</span></div>" +
      "</div></a>"
    );
  }

  function miniTemplate(article) {
    return (
      '<a class="hl-mini reveal" href="' +
      UI.articleUrl(article.slug) +
      '">' +
      '<div class="hl-mini__media"><img src="' +
      esc(coverOf(article)) +
      '" alt="" loading="lazy" decoding="async"></div>' +
      '<div class="hl-mini__body">' +
      tagList(article.categories, 1) +
      "<h3>" +
      esc(article.title) +
      "</h3>" +
      '<time datetime="' +
      esc(article.publishedAt) +
      '">' +
      esc(UI.formatDate(article.publishedAt)) +
      "</time>" +
      "</div></a>"
    );
  }

  var highlightGrid = document.getElementById("highlightGrid");
  if (highlightGrid) {
    if (!articles.length) {
      highlightGrid.innerHTML =
        '<p class="empty-state">Belum ada artikel. Jalankan <strong>node tools/sync-medium.mjs</strong> untuk menarik konten terbaru.</p>';
    } else {
      var featured = articles.slice(0, 3);
      var html = featureTemplate(featured[0]);
      if (featured.length > 1) {
        html +=
          '<div class="hl-side">' +
          featured
            .slice(1)
            .map(miniTemplate)
            .join("") +
          "</div>";
      }
      highlightGrid.innerHTML = html;
    }
  }

  function articleCardTemplate(article, index) {
    return (
      '<a class="article-card reveal" href="' +
      UI.articleUrl(article.slug) +
      '" style="transition-delay:' +
      Math.min(index, 8) * 40 +
      'ms">' +
      '<div class="article-card__media"><img src="' +
      esc(coverOf(article)) +
      '" alt="" loading="lazy" decoding="async"></div>' +
      '<div class="article-card__body">' +
      '<div class="article-card__tags">' +
      tagList(article.categories, 3) +
      "</div>" +
      '<h3 class="article-card__title">' +
      esc(article.title) +
      "</h3>" +
      '<p class="article-card__excerpt">' +
      esc(article.excerpt) +
      "</p>" +
      '<div class="article-card__meta"><span><i data-lucide="calendar"></i>' +
      esc(UI.formatDate(article.publishedAt)) +
      '</span><span><i data-lucide="clock"></i>' +
      esc(String(article.readingTime || 1)) +
      " mnt</span></div>" +
      "</div></a>"
    );
  }

  var grid = document.getElementById("articleGrid");
  var filterBar = document.getElementById("categoryFilters");
  var countEl = document.getElementById("articleCount");
  var activeFilter = "Semua";

  function categoryList() {
    var counts = {};
    articles.forEach(function (article) {
      (article.categories || []).forEach(function (category) {
        counts[category] = (counts[category] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
      })
      .slice(0, 8);
  }

  function renderArticles() {
    if (!grid) {
      return;
    }
    var list =
      activeFilter === "Semua"
        ? articles
        : articles.filter(function (article) {
            return (article.categories || []).indexOf(activeFilter) !== -1;
          });

    grid.innerHTML = list.length
      ? list.map(articleCardTemplate).join("")
      : '<p class="empty-state">Tidak ada artikel pada kategori ini.</p>';

    if (countEl) {
      countEl.textContent =
        list.length + " artikel" + (activeFilter === "Semua" ? "" : " · " + prettyCategory(activeFilter));
    }

    UI.refreshIcons();
    UI.observeReveals(grid);
    wireImageFallback(grid);
  }

  if (filterBar) {
    var categories = categoryList();
    var chips = ['<button class="filter-chip is-active" type="button" data-filter="Semua">Semua</button>'];
    categories.forEach(function (category) {
      chips.push(
        '<button class="filter-chip" type="button" data-filter="' +
          esc(category) +
          '">' +
          esc(prettyCategory(category)) +
          "</button>"
      );
    });
    filterBar.innerHTML = chips.join("");
    filterBar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) {
        return;
      }
      activeFilter = button.getAttribute("data-filter");
      Array.prototype.forEach.call(filterBar.querySelectorAll("[data-filter]"), function (chip) {
        chip.classList.toggle("is-active", chip === button);
      });
      renderArticles();
    });
  }

  function wireImageFallback(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("img"), function (image) {
      if (image.dataset.fallbackWired) {
        return;
      }
      image.dataset.fallbackWired = "1";
      image.addEventListener("error", function () {
        if (image.dataset.videoThumb === "1" && !image.dataset.retried) {
          image.dataset.retried = "1";
          var id = image.getAttribute("data-video-id");
          if (id) {
            image.src = "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg";
            return;
          }
        }
        image.src = fallbackCover;
      });
    });
  }

  function videoCardTemplate(video, index) {
    return (
      '<button class="video-card reveal" type="button" data-video-id="' +
      esc(video.id) +
      '" data-video-title="' +
      esc(video.title) +
      '" style="transition-delay:' +
      Math.min(index, 5) * 40 +
      'ms">' +
      '<span class="video-card__media">' +
      '<img src="https://i.ytimg.com/vi/' +
      esc(video.id) +
      '/hqdefault.jpg" alt="" loading="lazy" decoding="async" data-video-thumb="1" data-video-id="' +
      esc(video.id) +
      '">' +
      '<span class="video-card__play" aria-hidden="true"><span><i data-lucide="play"></i></span></span>' +
      "</span>" +
      '<span class="video-card__body">' +
      '<span class="video-card__title">' +
      esc(video.title) +
      "</span>" +
      '<span class="video-card__meta"><span><i data-lucide="monitor-play"></i>YouTube</span><span>Tonton</span></span>' +
      "</span></button>"
    );
  }

  var videoGrid = document.getElementById("videoGrid");
  if (videoGrid) {
    var shownVideos = videos.slice(0, 6);
    videoGrid.innerHTML = shownVideos.length
      ? shownVideos.map(videoCardTemplate).join("")
      : '<p class="empty-state">Belum ada video.</p>';
    wireImageFallback(videoGrid);
  }

  var statArticles = document.getElementById("statArticles");
  if (statArticles && articles.length) {
    statArticles.textContent = String(articles.length);
  }
  var statVideos = document.getElementById("statVideos");
  if (statVideos && videos.length) {
    statVideos.textContent = String(videos.length);
  }

  renderArticles();

  var modal = document.getElementById("videoModal");
  var modalFrame = document.getElementById("videoModalFrame");
  var modalTitle = document.getElementById("videoModalTitle");
  var modalOpen = false;
  var lastFocused = null;

  function openVideo(id, title, trigger) {
    if (!modal || !modalFrame) {
      return;
    }
    lastFocused = trigger || document.activeElement;
    modalTitle.textContent = title || "Video";
    modalFrame.innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(id) +
      '?autoplay=1&rel=0" title="' +
      esc(title || "Video YouTube") +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
    modalOpen = true;
    var closeButton = modal.querySelector(".video-modal__head .icon-btn");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeVideo() {
    if (!modalOpen) {
      return;
    }
    modal.classList.remove("is-open");
    modal.hidden = true;
    modalFrame.innerHTML = "";
    document.body.classList.remove("no-scroll");
    modalOpen = false;
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
  }

  if (videoGrid) {
    videoGrid.addEventListener("click", function (event) {
      var card = event.target.closest("[data-video-id]");
      if (!card) {
        return;
      }
      openVideo(card.getAttribute("data-video-id"), card.getAttribute("data-video-title"), card);
    });
  }

  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target.closest("[data-modal-close]")) {
        closeVideo();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (!modalOpen) {
        return;
      }
      if (event.key === "Escape") {
        closeVideo();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      var focusable = modal.querySelectorAll(
        'button, [href], iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  UI.observeReveals(document);
  window.LangitHome = {
    renderArticles: renderArticles,
    openVideo: openVideo,
    closeVideo: closeVideo
  };
})();
