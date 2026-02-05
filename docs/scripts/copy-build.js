const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'out');
const dest = path.join(__dirname, '..');

// 出力先フォルダから .gitkeep を除いた全ファイルを削除
if (fs.existsSync(dest)) {
  const files = fs.readdirSync(dest);
  files.forEach(file => {
    if (file !== '.gitkeep' && file !== 'scripts' && file !== '.next' && file !== 'node_modules' && file !== '.git') {
      const filePath = path.join(dest, file);
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  });
}

// out の内容を docs にコピー
if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log('✓ Build output copied to docs folder');
}
