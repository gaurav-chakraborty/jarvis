import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(process.cwd());
const FILE_INDEX_PATH = path.join(ROOT_DIR, 'FILE_INDEX.md');
const CHANGELOG_PATH = path.join(ROOT_DIR, 'CHANGELOG.md');

function getFileTree(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let tree = '';

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);
    
    if (entry.isDirectory()) {
      tree += `\n## \`${relativePath}/\`\n`;
      tree += getFileTree(fullPath, prefix + '  ');
    } else {
      const stats = fs.statSync(fullPath);
      const size = (stats.size / 1024).toFixed(1);
      tree += `- **\`${entry.name}\`** (${size}KB)\n`;
    }
  }
  return tree;
}

function updateFileIndex() {
  console.log('Updating FILE_INDEX.md...');
  const header = `# File Index\nComplete directory structure and file descriptions.\nAuto-generated — do not edit manually.\n*Last updated: ${new Date().toISOString().replace('T', ' ').split('.')[0]}*\n---\n`;
  const tree = getFileTree(ROOT_DIR);
  fs.writeFileSync(FILE_INDEX_PATH, header + tree);
}

function updateChangelog() {
  console.log('Updating CHANGELOG.md...');
  try {
    const gitLog = execSync('git log --pretty=format:"- %ad: %s (%h)" --date=short -n 10').toString();
    const header = `# Changelog\n\n## Recent Updates\n\n`;
    fs.writeFileSync(CHANGELOG_PATH, header + gitLog + '\n');
  } catch (e) {
    console.warn('Git not initialized or no commits found. Skipping changelog update.');
  }
}

updateFileIndex();
updateChangelog();
console.log('Maintenance complete.');
