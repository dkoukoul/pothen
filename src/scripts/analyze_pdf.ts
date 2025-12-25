const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = process.argv[2] || 'hellenic_parliament_pdfs/ABDELAS_APOSTOLOS_4103062_2024e.pdf';

console.log(`Analyzing: ${pdfPath}`);

if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

// pdf-parse exports a function directly, ensuring correct usage:
pdf(dataBuffer).then(function(data) {
    console.log(`\nPages: ${data.numpages}`);
    console.log(`Info: `, data.info);
    console.log(`\n--- Text Content (Full) ---`);
    console.log(data.text);
    
    // Check for specific keywords to guess sections
    const keywords = ['ΑΚΙΝΗΤΑ', 'ΟΧΗΜΑΤΑ', 'ΚΑΤΑΘΕΣΕΙΣ', 'ΕΙΣΟΔΗΜΑΤΑ'];
    console.log(`\n--- Keyword Check ---`);
    keywords.forEach(kw => {
        const found = data.text.includes(kw);
        console.log(`${kw}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });

}).catch(err => {
    console.error("Error parsing PDF:", err);
});
