// Build script to fix barrelsby for ESM
const fs = require('fs');
const path = require('path');
const config = require('./.barrelsby.json');

for(let barrel of config.directory) {
    const filePath = path.join(__dirname, barrel + '/index.ts');
    if (fs.existsSync(filePath)) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            const result = data.replace(/";/g, '.js";');

            fs.writeFile(filePath, result, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                }
            });
        });
    }
}