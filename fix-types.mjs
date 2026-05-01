import fs from 'fs';
const path = 'C:\\Users\\pheli\\.gemini\\antigravity\\brain\\a0de4502-19ab-459d-a192-aeb64fdf3db2\\.system_generated\\steps\\81\\output.txt';
const outPath = 'd:\\Projeto Argos 1\\src\\types\\database.types.ts';
try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (data.types) {
        fs.writeFileSync(outPath, data.types);
        console.log('Types written successfully');
    } else {
        console.log('No types found in JSON');
    }
} catch (e) {
    console.error(e);
}
