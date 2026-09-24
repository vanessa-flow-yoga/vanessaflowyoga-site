module.exports = class LatestPosts {
  data() {
    return { permalink: '/content/latest-posts.json', eleventyExcludeFromCollections: true };
  }

  render(data) {
    const legacyPosts = data.collections.all
      .filter((item) => item.inputPath.startsWith('./post/') && item.inputPath.endsWith('.md'))
      .map((item) => {
        const published = item.data.published instanceof Date
          ? item.data.published.toISOString().slice(0, 10)
          : String(item.data.published).slice(0, 10);
        const slug = item.fileSlug;
        return {
          title: item.data.title,
          description: item.data.description,
          category: item.data.category,
          readTime: item.data.readTime,
          published,
          href: `/post/${slug}`,
          image: item.data.image || `/images/blog/${slug}.webp`,
        };
      });
    const posts = legacyPosts.sort((a, b) => b.published.localeCompare(a.published));
    return JSON.stringify({ schema_version: '1.0', posts });
  }
};
