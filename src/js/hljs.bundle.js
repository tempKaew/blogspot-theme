hljs.configure({ cssSelector: "code" });
hljs.highlightAll();
hljs.addPlugin({
  "after:highlightElement": ({ el, text }) => {
    const wrapper = el.parentElement;
    if (wrapper == null) {
      return;
    }
    wrapper.classList.add("relative");

    const copyButton = document.createElement("button");
    copyButton.classList.add("btn-copy-code");
    const iconButton = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.13a1 1 0 0 1 .24-.65L7.7 8.35A1 1 0 0 1 8.46 8H13a1 1 0 0 1 1 1Z"/></svg>`;
    copyButton.innerHTML = iconButton;
    copyButton.onclick = () => {
      navigator.clipboard.writeText(text);
      copyButton.innerHTML = "Copied";
      setTimeout(() => {
        copyButton.innerHTML = iconButton;
      }, 2000);
    };

    wrapper.appendChild(copyButton);
  },
});
