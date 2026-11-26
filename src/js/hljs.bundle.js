document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js";
  script.onload = () => {
    hljs.configure({ cssSelector: "code" });
    hljs.addPlugin({
      "after:highlightElement": ({ el, text }) => {
        const wrapper = el.parentElement;
        if (wrapper == null || wrapper.tagName !== "PRE") {
          return;
        }
        wrapper.classList.add("relative");

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.classList.add("btn-copy-code");
        const iconCopy = `<svg class="btn-copy-code__copy" aria-hidden="true" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.13a1 1 0 0 1 .24-.65L7.7 8.35A1 1 0 0 1 8.46 8H13a1 1 0 0 1 1 1Z"/></svg>`;
        const iconCheck = `<svg class="btn-copy-code__check" aria-hidden="true" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 13.5 9.2 18 19 7"/></svg>`;
        copyButton.innerHTML = `<span class="btn-copy-code__swap">${iconCopy}${iconCheck}</span><span class="btn-copy-code__label" aria-hidden="true">Copied</span><span class="visually-hidden">Copy code</span>`;
        const accessibleName = copyButton.querySelector(".visually-hidden");
        const setName = (value) => {
          copyButton.setAttribute("aria-label", value);
          accessibleName.textContent = value;
        };
        setName("Copy code");
        let copiedTimer = 0;
        copyButton.onclick = () => {
          navigator.clipboard.writeText(text).then(() => {
            copyButton.classList.remove("is-copied");
            void copyButton.offsetWidth;
            copyButton.classList.add("is-copied");
            setName("Copied");
            window.clearTimeout(copiedTimer);
            copiedTimer = window.setTimeout(() => {
              copyButton.classList.remove("is-copied");
              setName("Copy code");
            }, 1600);
          });
        };

        wrapper.appendChild(copyButton);
      },
    });
    hljs.highlightAll();
  };
  document.head.appendChild(script);
});
