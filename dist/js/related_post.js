(function () {
  'use strict';

  (function () {
    if (typeof document.querySelector === "undefined") return;

    let script;
    const config = { maxPostsToFetch: 5 };

    const postLink = document.querySelector("link[rel=canonical]")?.href;
    if (!/\x2F\d{4}\x2F\d{2}\x2F/.test(postLink)) return;

    window.bloggerRelatedPosts_callback = function (data) {
      const entries = data.feed?.entry || [];
      const relatedPosts = [];
      if (entries.length === 0) return;

      entries.forEach((entry) => {
        const item = {
          title: entry.title?.$t || "No title",
          updated: new Date(entry.updated?.$t || ""),
          categories: [],
          link: "",
        };

        const links = entry.link || [];
        for (let j = 0; j < links.length; j++) {
          if (links[j].rel === "alternate") {
            item.link = links[j].href;
            break;
          }
        }
        if (item.link === postLink) return;

        const categories = entry.category || [];
        categories.forEach((cat) => {
          item.categories.push(cat.term);
        });

        relatedPosts.push(item);
      });
      if (relatedPosts.length === 0) return;

      const div = document.createElement("div");
      div.id = "blogger-related-posts";
      div.className = "related";

      const title = document.createElement("h3");
      title.className = "related__title";
      title.textContent = "บทความที่เกี่ยวข้อง";
      div.appendChild(title);

      const list = document.createElement("div");
      list.className = "related__list";
      relatedPosts.forEach((post) => {
        const link = document.createElement("a");
        link.className = "related__link";
        link.href = post.link;

        const label = post.categories.find((name) => name !== "projects");
        if (label) {
          const meta = document.createElement("span");
          meta.className = "related__meta";
          meta.textContent = label;
          link.appendChild(meta);
        }

        const name = document.createElement("span");
        name.className = "related__name";
        name.textContent = post.title;
        link.appendChild(name);
        list.appendChild(link);
      });

      div.appendChild(list);

      const blogContent = document.getElementById("Blog1");
      blogContent.appendChild(div);
    };

    script = document.createElement("script");
    const query = postCategories.length
      ? `&q=${encodeURIComponent(
        'label:"' + postCategories.join('" | label:"') + '"'
      )}`
      : "";
    script.src = `https://tempkaew.blogspot.com/feeds/posts/summary?alt=json&orderby=updated&callback=bloggerRelatedPosts_callback&max-results=${config.maxPostsToFetch}${query}`;
    document.querySelector("head").appendChild(script);
  })();

})();
