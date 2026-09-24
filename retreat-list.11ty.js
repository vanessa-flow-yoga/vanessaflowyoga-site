const fs = require('node:fs');
const path = require('node:path');

module.exports = class RetreatList {
  data() {
    return { permalink: '/content/retreat-list.json', eleventyExcludeFromCollections: true };
  }

  render() {
    const folder = path.join(__dirname, 'content', 'retreats');
    const retreats = fs.readdirSync(folder)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        const data = JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
        if (data.schema_version !== '1.0') throw new Error(`Unknown retreat schema: ${name}`);
        return { ...data, slug: name.slice(0, -5) };
      })
      .filter((retreat) => retreat.published === true);
    return JSON.stringify({ schema_version: '1.0', retreats });
  }
};
