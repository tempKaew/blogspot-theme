(function () {
  'use strict';

  document.addEventListener("DOMContentLoaded", function () {
    const mainWrapper = document.getElementById("mainWrapper");
    const blog1 = document.getElementById("Blog1");
    if (!mainWrapper) {
      return;
    }
    if (!blog1) {
      return;
    }
    const content = blog1.querySelector(".content");
    if (!content) {
      return;
    }
    const headings = content.querySelectorAll("h2, h3");
    if (headings.length === 0) {
      return;
    }
    const tocDiv = document.createElement("div");
    tocDiv.id = "toc";
    const contentRect = content.getBoundingClientRect();
    const topPosition = contentRect.top + window.scrollY;
    tocDiv.style.marginTop = `${topPosition}px`;
    const body = document.body;
    tocDiv.style.height = `${body.scrollHeight - topPosition}px`;
    const tocContentDiv = document.createElement("div");
    tocContentDiv.id = "toc-content";
    const tocTitle = document.createElement("h3");
    tocTitle.textContent = "Table of Contents";
    tocContentDiv.appendChild(tocTitle);
    const tocUl = document.createElement("ul");
    tocContentDiv.appendChild(tocUl);
    let currentLi;
    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      if (heading.tagName === "H2") {
        currentLi = document.createElement("li");
        currentLi.appendChild(link);
        tocUl.appendChild(currentLi);
      } else if (heading.tagName === "H3" && currentLi) {
        let subUl = currentLi.querySelector("ul");
        if (!subUl) {
          subUl = document.createElement("ul");
          currentLi.appendChild(subUl);
        }
        const subLi = document.createElement("li");
        subLi.appendChild(link);
        subUl.appendChild(subLi);
      } else {
        const li = document.createElement("li");
        li.appendChild(link);
        tocUl.appendChild(li);
      }
    });
    tocDiv.appendChild(tocContentDiv);
    document.body.appendChild(tocDiv);
  });

})();
