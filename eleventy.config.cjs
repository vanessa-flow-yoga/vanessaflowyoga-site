// Eleventy config — Vanessa Flow Yoga
//
// STAGE 1a: pure passthrough. Every file is copied verbatim into _site, so the
// built site is byte-identical to the hand-written one. Nothing is processed as
// a template yet. Pages get converted to templates one at a time from here.

module.exports = function (eleventyConfig) {
  // Whole directories, copied as-is
  ["images", "fonts", "videos", "post"].forEach((dir) =>
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

  return {
    dir: { input: ".", output: "_site" },
    // Nothing is a template yet — see the stage note above
    templateFormats: [],
  };
};
