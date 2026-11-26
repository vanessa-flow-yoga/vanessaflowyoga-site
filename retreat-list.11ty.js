const fs = require('node:fs');
const path = require('node:path');
const {SCHEMA} = require('./shared/retreat-page.cjs');

// Index of retreat files for the admin's local preview list. Lists every
// schema 2.0 retreat (shown or not); older-format files are skipped.
module.exports = class RetreatList {
  data() {
    return { permalink: '/content/retreat-list.json', eleventyExcludeFromCollections: true };
  }

  render() {
    const folder = path.join(__dirname, 'content', 'retreats');
    const names = fs.existsSync(folder) ? fs.readdirSync(folder).filter((name) => name.endsWith('.json')) : [];
    const retreats = names
      .map((name) => ({ ...JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8')), slug: name.slice(0, -5) }))
      .filter((retreat) => retreat.schema_version === SCHEMA);
    // List schema 2.0: entries are retreat schema 2.0 objects plus slug.
    // Was 1.0 (entries were retreat 1.0 objects filtered to published).
    return JSON.stringify({ schema_version: '2.0', retreats });
  }
};
