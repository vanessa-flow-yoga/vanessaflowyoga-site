// Eleventy config — Vanessa Flow Yoga
//
// Blog posts are markdown (post/*.md) rendered through _includes/post.njk.
// Every other page is still hand-written HTML and is copied through verbatim;
// those get converted to templates in later stages.

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fs = require('node:fs');

module.exports = function (eleventyConfig) {
  // Internal notes must never be published as site pages.
  eleventyConfig.ignores.add('docs/**');

  // Whole directories, copied as-is. "post" is NOT here: it holds markdown now.
  ["images", "fonts", "videos", "content"].forEach((dir) =>
    eleventyConfig.addPassthroughCopy(dir)
  );

  // Root-level site files. This config is named .cjs precisely so the *.js
  // glob below cannot pick it up and copy it into the published output.
  ["*.html", "*.css", "*.txt", "*.xml", "*.svg"].forEach((glob) =>
    eleventyConfig.addPassthroughCopy(glob)
  );
  fs.readdirSync(__dirname).filter((name) => name.endsWith('.js') && !name.endsWith('.11ty.js'))
    .forEach((name) => eleventyConfig.addPassthroughCopy(name));

  // Netlify control files (leading underscore, so they need naming explicitly)
  eleventyConfig.addPassthroughCopy("_headers");
  eleventyConfig.addPassthroughCopy("_redirects");

  // Only the separate Netlify admin project publishes the website studio.
  if (process.env.VFY_ADMIN_PROJECT === '1') eleventyConfig.addPassthroughCopy('admin');

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
    templateFormats: ["md", "11ty.js"],
    markdownTemplateEngine: false, // post bodies are content, not templates
    htmlTemplateEngine: "njk",
  };
};
