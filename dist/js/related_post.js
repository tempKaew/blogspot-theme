(function () {
  'use strict';

  (function () {
    if (typeof document.querySelector === "undefined") return;
    let script;
    const config = {
      maxPostsToFetch: 5
    };
    const postLink = document.querySelector("link[rel=canonical]")?.href;
    if (!/\x2F\d{4}\x2F\d{2}\x2F/.test(postLink)) return;
    window.bloggerRelatedPosts_callback = function (data) {
      const entries = data.feed?.entry || [];
      const relatedPosts = [];
      if (entries.length === 0) return;
      entries.forEach(entry => {
        const item = {
          title: entry.title?.$t || "No title",
          updated: new Date(entry.updated?.$t || ""),
          categories: [],
          link: ""
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
        categories.forEach(cat => {
          item.categories.push(cat.term);
        });
        relatedPosts.push(item);
      });
      if (relatedPosts.length === 0) return;
      const div = document.createElement("div");
      div.id = "blogger-related-posts";
      div.innerHTML = "<h4>Related Posts</h4>";
      const ul = document.createElement("ul");
      relatedPosts.forEach(post => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = post.link;
        a.textContent = post.title;
        li.appendChild(a);
        ul.appendChild(li);
      });
      div.appendChild(ul);
      const blogContent = document.getElementById("Blog1");
      blogContent.appendChild(div);
    };
    script = document.createElement("script");
    const query = postCategories.length ? `&q=${encodeURIComponent('label:"' + postCategories.join('" | label:"') + '"')}` : "";
    script.src = `https://tempkaew.blogspot.com/feeds/posts/summary?alt=json&orderby=updated&callback=bloggerRelatedPosts_callback&max-results=${config.maxPostsToFetch}${query}`;
    document.querySelector("head").appendChild(script);
  })();

})();
