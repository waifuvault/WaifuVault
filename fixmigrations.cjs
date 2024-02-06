// Build script to fix barrelsby for ESM
const fs = require('fs');
const path = require('path');
const config = require('./.barrelsby.json');

const dirPath = path.join(__dirname, '/src/migrations');
fs.readdir(dirPath, function (err, files) {
    if (err) {
        return console.log('Unable to scan migrations: ' + err);
    }

    files.forEach(function (file) {
        const filePath = path.join(dirPath, file);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            const result = data.replace('import { MigrationInterface, QueryRunner }', 'import type { MigrationInterface, QueryRunner }');

            fs.writeFile(filePath, result, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                }
            });
        });
    });
});
