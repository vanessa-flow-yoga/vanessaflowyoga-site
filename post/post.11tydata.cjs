// Shared settings for every blog post. Post .md files only carry the fields
// Vanessa actually edits; everything below is derived from those.

const SITE = "https://vanessaflowyoga.co.uk";

// The CMS's date picker may write the date unquoted, which YAML turns into a
// Date object, while the migrated posts carry it as a quoted string. Accept
// either and always end up with plain YYYY-MM-DD.
const isoDate = (v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

module.exports = {
  layout: "post.njk",
  // Published as /post/<slug>.html, which Netlify serves at /post/<slug> —
  // exactly the URLs the posts had before, so no link or ranking is lost.
  permalink: (data) => `/post/${data.page.fileSlug}.html`,

  eleventyComputed: {
    canonical: (d) => `${SITE}/post/${d.page.fileSlug}`,
    publishedISO: (d) => isoDate(d.published),
    // Cover image: whatever the CMS uploaded, else the migrated naming scheme.
    hero: (d) => d.image || `/images/blog/${d.page.fileSlug}.webp`,
    cat: (d) => {
      const c = d.blogCategories[d.category];
      if (!c) throw new Error(`Unknown blog category "${d.category}" in ${d.page.inputPath}`);
      return c;
    },
    jsonld: (d) =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: d.title,
        description: d.description,
        image: SITE + (d.image || `/images/blog/${d.page.fileSlug}.webp`),
        datePublished: isoDate(d.published),
        dateModified: isoDate(d.updated || d.published),
        author: { "@type": "Organization", name: "Vanessa Flow Yoga" },
        publisher: {
          "@type": "Organization",
          name: "Vanessa Flow Yoga Ltd",
          logo: { "@type": "ImageObject", url: `${SITE}/images/logo.png` },
        },
        articleSection: d.category,
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/post/${d.page.fileSlug}` },
      }),
  },
};
