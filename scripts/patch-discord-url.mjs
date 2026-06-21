import fs from 'fs';

const file = process.argv[2] || 'data/site-content.json';
const url = process.argv[3] || 'https://discord.gg/TsDbxrZVwg';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.social = { ...data.social, discordUrl: url };
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Updated ${file} discordUrl → ${url}`);