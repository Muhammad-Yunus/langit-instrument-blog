(function () {
  var articles = window.LANGIT_ARTICLES || [];
  var UI = window.LangitUI;
  var esc = UI.escapeHtml;
  var root = document.getElementById("articleRoot");
  var notFound = document.getElementById("articleNotFound");
  var params = new URLSearchParams(window.location.search);
  var slug = params.get("slug");
  var article = null;

  for (var index = 0; index < articles.length; index += 1) {
    if (articles[index].slug === slug) {
      article = articles[index];
      break;
    }
  }

  function setMeta(attribute, key, value) {
    if (!value) {
      return;
    }
    var element = document.querySelector("meta[" + attribute + '="' + key + '"]');
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.setAttribute("content", value);
  }

  if (!article) {
    if (notFound) {
      notFound.hidden = false;
    }
    document.title = "Artikel tidak ditemukan — Langit Instrument";
    return;
  }

  document.title = article.title + " — Langit Instrument";
  setMeta("name", "description", article.excerpt);
  setMeta("property", "og:title", article.title);
  setMeta("property", "og:description", article.excerpt);
  setMeta("property", "og:image", article.cover || UI.fallbackCover);
  setMeta("property", "og:url", window.location.href);
  setMeta("property", "article:published_time", article.publishedAt);

  var articleLink = document.querySelector('.nav__link[href="index.html#artikel"]');
  if (articleLink) {
    articleLink.classList.add("is-active");
  }

  var breadcrumbTitle = document.getElementById("breadcrumbTitle");
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = article.title;
  }

  var titleEl = document.getElementById("articleTitle");
  if (titleEl) {
    titleEl.textContent = article.title;
  }

  var tagsEl = document.getElementById("articleTags");
  if (tagsEl) {
    tagsEl.innerHTML = (article.categories || [])
      .map(function (category) {
        return '<span class="tag">' + esc(category) + "</span>";
      })
      .join("");
  }

  var dateEl = document.getElementById("articleDate");
  if (dateEl) {
    dateEl.textContent = UI.formatDate(article.publishedAt);
  }

  var readEl = document.getElementById("articleRead");
  if (readEl) {
    readEl.textContent = article.readingTime + " menit baca";
  }

  var cover = document.getElementById("articleCover");
  var coverImg = document.getElementById("articleCoverImg");
  if (cover && coverImg) {
    if (article.cover) {
      coverImg.src = article.cover;
      coverImg.alt = article.title;
      cover.hidden = false;
      coverImg.addEventListener("error", function () {
        cover.hidden = true;
      });
    } else {
      cover.hidden = true;
    }
  }

  var body = document.getElementById("articleBody");
  if (body) {
    body.innerHTML = article.contentHtml;

    Array.prototype.forEach.call(body.querySelectorAll("img"), function (image) {
      image.loading = "lazy";
      image.decoding = "async";
      if (!image.hasAttribute("alt")) {
        image.setAttribute("alt", "");
      }
      image.addEventListener("error", function () {
        image.style.display = "none";
      });
    });

    Array.prototype.forEach.call(body.querySelectorAll("a"), function (link) {
      var href = link.getAttribute("href") || "";
      if (/^https?:/i.test(href) && !link.getAttribute("target")) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    Array.prototype.forEach.call(
      body.querySelectorAll(".article-youtube[data-yt-id]"),
      function (slot) {
        var id = slot.getAttribute("data-yt-id");
        slot.innerHTML =
          '<button class="yt-inline" type="button" data-yt-play="' +
          esc(id) +
          '" aria-label="Putar video YouTube">' +
          '<img src="https://i.ytimg.com/vi/' +
          esc(id) +
          '/hqdefault.jpg" alt="" loading="lazy" decoding="async">' +
          '<span class="yt-inline__play"><i data-lucide="play"></i></span></button>';
      }
    );

    body.addEventListener("click", function (event) {
      var button = event.target.closest("[data-yt-play]");
      if (!button) {
        return;
      }
      var slot = button.closest(".article-youtube");
      var id = button.getAttribute("data-yt-play");
      if (!slot || !id) {
        return;
      }
      slot.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/' +
        encodeURIComponent(id) +
        '?autoplay=1&rel=0" title="Video YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    });

    UI.refreshIcons();
  }

  var mediumLink = document.getElementById("articleMediumLink");
  if (mediumLink) {
    mediumLink.href = article.mediumUrl;
  }

  var pageUrl = window.location.href;
  var shareWa = document.getElementById("shareWa");
  if (shareWa) {
    shareWa.href =
      "https://wa.me/?text=" + encodeURIComponent(article.title + " — " + pageUrl);
  }

  var shareFb = document.getElementById("shareFb");
  if (shareFb) {
    shareFb.href =
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(pageUrl);
  }

  var shareCopy = document.getElementById("shareCopy");
  if (shareCopy) {
    shareCopy.addEventListener("click", function () {
      var done = function () {
        UI.toast("Link artikel disalin");
      };
      var fallback = function () {
        var area = document.createElement("textarea");
        area.value = pageUrl;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          done();
        } catch (error) {
          UI.toast("Salin manual: " + pageUrl);
        }
        document.body.removeChild(area);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pageUrl).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }

  var relatedGrid = document.getElementById("relatedGrid");
  var relatedSection = document.getElementById("articleRelated");
  if (relatedGrid && relatedSection) {
    var related = articles.filter(function (item) {
      return (
        item.slug !== article.slug &&
        (item.categories || []).some(function (category) {
          return (article.categories || []).includes(category);
        })
      );
    });

    if (related.length < 3) {
      articles.forEach(function (item) {
        if (related.length >= 3) {
          return;
        }
        if (item.slug !== article.slug && related.indexOf(item) === -1) {
          related.push(item);
        }
      });
    }

    related = related.slice(0, 3);

    relatedGrid.innerHTML = related
      .map(function (item, position) {
        return (
          '<a class="article-card reveal" href="' +
          UI.articleUrl(item.slug) +
          '" style="transition-delay:' +
          position * 50 +
          'ms">' +
          '<div class="article-card__media"><img src="' +
          esc(item.cover || UI.fallbackCover) +
          '" alt="" loading="lazy" decoding="async"></div>' +
          '<div class="article-card__body">' +
          '<div class="article-card__tags">' +
          (item.categories || [])
            .slice(0, 2)
            .map(function (category) {
              return '<span class="tag">' + esc(category) + "</span>";
            })
            .join("") +
          "</div>" +
          '<h3 class="article-card__title">' +
          esc(item.title) +
          "</h3>" +
          '<div class="article-card__meta"><span><i data-lucide="calendar"></i>' +
          esc(UI.formatDate(item.publishedAt)) +
          '</span><span><i data-lucide="clock"></i>' +
          esc(String(item.readingTime || 1)) +
          " mnt</span></div>" +
          "</div></a>"
        );
      })
      .join("");

    relatedSection.hidden = related.length === 0;
    UI.observeReveals(relatedGrid);
    UI.refreshIcons();
  }

  if (root) {
    root.hidden = false;
  }

  var progress = document.getElementById("readingProgress");
  if (root && progress) {
    var updateProgress = function () {
      var rect = root.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var passed = -rect.top;
      var ratio = total > 0 ? passed / total : 0;
      if (rect.bottom <= window.innerHeight + 1) {
        ratio = 1;
      }
      ratio = Math.min(1, Math.max(0, ratio));
      progress.style.width = (ratio * 100).toFixed(2) + "%";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  UI.observeReveals(document);
  UI.refreshIcons();
})();
