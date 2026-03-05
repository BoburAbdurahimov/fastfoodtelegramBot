const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function (filePath) {
    if (filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Pattern for $${formatCurrency(...)}
        const regex = /\$\$\{formatCurrency\(([^)]+)\)\}/g;

        // Pattern for simple $ variables like $${e.amount} if any
        const regex2 = /\$\$\{([^}]+)\}/g;

        // Pattern for plain $ before numbers: $ 500, $500
        // But formatCurrency is mostly what we have.

        if (regex.test(content)) {
            content = content.replace(regex, '${formatCurrency($1)} UZS');
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
