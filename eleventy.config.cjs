// Eleventy config — Vanessa Flow Yoga
//
// Blog posts are markdown (post/*.md) rendered through _includes/post.njk.
// Every other page is still hand-written HTML and is copied through verbatim;
// those get converted to templates in later stages.

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

module.exports = function (eleventyConfig) {
  // Whole directories, copied as-is. "post" is NOT here: it holds markdown now.
  ["images", "fonts", "videos"].forEach((dir) =>
    eleventyConfig.addPassthroughCopy(dir)
  );

  // Root-level site files. This config is named .cjs precisely so the *.js
  // glob below cannot pick it up and copy it into the published output.
  ["*.html", "*.css", "*.js", "*.txt", "*.xml", "*.svg"].forEach((glob) =>
    eleventyConfig.addPassthroughCopy(glob)
  );

  // Netlify control files (leading underscore, so they need naming explicitly)
  eleventyConfig.addPassthroughCopy("_headers");
  eleventyConfig.addPassthroughCopy("_redirects");

  // The content editor, plus its app file served from our own domain rather
  // than a CDN, so the site's security policy can stay locked down.
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy({
    "node_modules/@sveltia/cms/dist/sveltia-cms.js": "admin/sveltia-cms.js",
  });

  // Escapes text the way the hand-written pages did: & " < > only, leaving
  // apostrophes alone. Keeps output identical to the pre-CMS pages.
  eleventyConfig.addFilter("vfyesc", (v) =>
    String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
             .replace(/</g, "&lt;").replace(/>/g, "&gt;")
  );

  // "2022-08-23" -> "Aug 2022". Parsed by hand so no timezone can shift it.
  eleventyConfig.addFilter("monthYear", (v) => {
    const [y, m] = String(v).split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  });

  // markdown-it escapes double quotes in body text; the hand-written pages left
  // them raw and escaped only & < >. Match that, so output is byte-for-byte the
  // same as the pages these posts replace.
  eleventyConfig.amendLibrary("md", (md) => {
    md.renderer.rules.text = (tokens, idx) =>
      tokens[idx].content
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });

  return {
    dir: { input: ".", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["md"],
    markdownTemplateEngine: false, // post bodies are content, not templates
    htmlTemplateEngine: "njk",
  };
};
