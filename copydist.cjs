// Copy all non ts* files to dist
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '/src');
const distDir = path.join(__dirname, '/dist');
const removedExtensions = ['.ts','.tsx'];

function copyFiles(src, dist) {
    // Copy files
    fs.readdirSync(src, { withFileTypes: true }).forEach(dirent => {
        const srcPath = path.join(src, dirent.name);
        const distPath = path.join(dist, dirent.name);

        if (dirent.isDirectory()) {
            // Descend directories
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath);
            }
            copyFiles(srcPath, distPath);
        } else if (!removedExtensions.includes(path.extname(srcPath))) {
            // Copy file with correct extension
            fs.copyFileSync(srcPath, distPath);
        }
    });
}

copyFiles(srcDir, distDir);