
import fs from 'fs';
// pdf-parse has issues with default import detection in bun sometimes triggering debug mode
const pdf = require('pdf-parse');
import { PrismaClient, PersonRole, SectionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        console.error("Please provide a PDF file path.");
        process.exit(1);
    }

    if (!fs.existsSync(pdfPath)) {
        console.error(`File not found: ${pdfPath}`);
        process.exit(1);
    }

    console.log(`Processing: ${pdfPath}`);
    const dataBuffer = fs.readFileSync(pdfPath);

    try {
        const data = await pdf(dataBuffer);
        const text = data.text;
        
        // --- 1. Extract Person Info ---
        // Primitive extraction based on lines following labels
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        
        let lastName = '';
        let firstName = '';
        let fatherName = '';
        
        // Find Subject Index        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === 'Επώνυμο :' && !lastName) {
                lastName = lines[i+1];
            }
            if (lines[i] === 'Όνομα :' && !firstName) {
                firstName = lines[i+1];
            }
            if (lines[i] === 'Όνομα πατρός :' && !fatherName) {
                fatherName = lines[i+1];
            }
            if (lastName && firstName && fatherName) break;
        }

        console.log(`Extracted Person: ${firstName} ${lastName} (Father: ${fatherName})`);

        if (!firstName || !lastName) {
            console.error("Failed to extract basic person info.");
            return;
        }

        // --- 2. Database Insert ---
        
        // Check if person exists
        let person = await prisma.person.findFirst({
            where: {
                firstName: firstName,
                lastName: lastName,
                father: fatherName || undefined 
            }
        });

        if (!person) {
            console.log("Creating new Person...");
            person = await prisma.person.create({
                data: {
                    firstName,
                    lastName,
                    father: fatherName,
                    role: PersonRole.SUBJECT
                }
            });
        } else {
            console.log("Person already exists found by name.");
        }

        console.log(`Person ID: ${person.id}`);

        // Create Declaration
        // Match year from filename
        const yearMatch = pdfPath.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        
        // Try to find declaration number in text
        let declarationNumber = `AUTO-${Date.now()}`;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('ΑΡΙΘΜΟΣ ΔΗΛΩΣΗΣ :')) {
                // The number might be on the next line
                 if (i + 1 < lines.length) {
                     declarationNumber = lines[i+1];
                 }
                 break;
            }
        }
        
        
        console.log(`Declaration Number: ${declarationNumber}, Year: ${year}`);
        
        let declaration = await prisma.declaration.findUnique({
            where: { declarationNumber },
        });

        if (!declaration) {
             declaration = await prisma.declaration.create({
                data: {
                    declarationNumber,
                    year,
                    personId: person.id
                }
            });
            console.log(`Declaration created: ${declaration.id}`);
        } else {
            console.log(`Declaration already exists: ${declaration.id}. Cleaning up old sections...`);
            await prisma.sectionEntry.deleteMany({
                where: { declarationId: declaration.id }
            });
        }
        
        try {
            // ... Parsing logic follows ...
            

        // --- Helper: Parse Greek Number ---
        const parseGreekNumber = (str: string): number | null => {
            if (!str) return null;
            // Remove dots (thousands), replace comma with dot (decimal)
            const clean = str.replace(/\./g, '').replace(/,/g, '.');
            const val = parseFloat(clean);
            return isNaN(val) ? null : val;
        };

        const isCurrency = (line: string) => ['ΕΥΡΩ', 'ΔΟΛΑΡΙΟ', 'ΛΙΡΑ', 'ΕΛΒΕΤΙΚΟ'].some(c => line.includes(c));

        // --- 3. Parsing Sections ---
        // We will sum up totals for the Declaration
        let totalIncome = 0;
        let totalDeposits = 0;
        let totalInvestments = 0;
        let realEstateCount = 0;

        let currentSection: SectionType | null = null;
        
        // Simple state machine
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect Section Start
            if (line.includes('Έσοδα από κάθε πηγή')) {
                currentSection = SectionType.INCOME;
                continue;
            } else if (line.includes('Μετοχές ημεδαπών') || line.includes('ΕΠΕΝΔΥΤΗΣ')) {
                currentSection = SectionType.SECURITY;
                continue;
            } else if (line.includes('Καταθέσεις σε τράπεζες')) {
                currentSection = SectionType.BANK_ACCOUNT;
                continue;
            } else if (line.includes('Ακίνητα και εμπράγματα')) {
                currentSection = SectionType.REAL_ESTATE;
                continue;
            } else if (line.includes('Οχήματα')) {
                currentSection = SectionType.OTHER; // Mapping vehicles to OTHER for now or ignore
                continue;
            }

            if (!currentSection) continue;

            // --- INCOME PARSING ---
            if (currentSection === SectionType.INCOME) {
                // Heuristic: Look for currency line. The line BEFORE it is usually the amount. 
                // The line BEFORE that (or earlier) has the description/holder.
                if (isCurrency(line)) {
                     // Look back for amount
                     let amountLineIdx = i - 1;
                     let amount = parseGreekNumber(lines[amountLineIdx]);
                     
                     // Sometimes there are empty lines or noise
                     if (amount === null && i - 2 >= 0) {
                        amountLineIdx = i - 2;
                        amount = parseGreekNumber(lines[amountLineIdx]);
                     }

                     if (amount !== null) {
                         totalIncome += amount;
                         
                         // Try to find description (lines above amount)
                         let description = "Income";
                         for (let k = amountLineIdx - 1; k >= amountLineIdx - 5; k--) {
                             if (k < 0) break;
                             if (lines[k].includes('ΥΠΟΧΡΕΟΣ') || lines[k].includes('ΣΥΖΥΓΟΣ')) {
                                 description = lines[k] + " " + (lines[k+1] !== lines[amountLineIdx] ? lines[k+1] : "");
                                 break;
                             }
                         }

                         await prisma.sectionEntry.create({
                             data: {
                                 declarationId: declaration.id,
                                 sectionType: SectionType.INCOME,
                                 holderRole: PersonRole.SUBJECT, // Defaulting, ideally parse from desc
                                 amount: amount,
                                 currency: line,
                                 data: { description },
                                 notes: "Auto-extracted"
                             }
                         });
                     }
                }
            }

            // --- DEPOSITS PARSING ---
            else if (currentSection === SectionType.BANK_ACCOUNT) {
                // Similar heuristic: Currency follows Amount.
                 if (isCurrency(line)) {
                     let amount = parseGreekNumber(lines[i-1]);
                     // Check if previous line was just a number '3' (quantity) and amount is before that?
                     // Pattern in txt: "3    407,28" on same line? Or split?
                     // Mitsotakis example: "3             183,20" line 314
                     // If split by spaces:
                     if (lines[i-1]) {
                         const potentialAmount = lines[i-1].trim().split(/\s+/).pop(); // Get last token
                         if (potentialAmount) amount = parseGreekNumber(potentialAmount);
                     }

                     if (amount !== null) {
                         totalDeposits += amount;
                         await prisma.sectionEntry.create({
                             data: {
                                 declarationId: declaration.id,
                                 sectionType: SectionType.BANK_ACCOUNT,
                                 holderRole: PersonRole.SUBJECT,
                                 amount: amount,
                                 currency: line,
                                 data: { raw: lines[i-1] },
                                 notes: "Deposit"
                             }
                         });
                     }
                 }
            }

            // --- INVESTMENTS PARSING ---
            else if (currentSection === SectionType.SECURITY) {
                // Pattern: "0,00 7.838,02 0,00" -> Acquisition, Valuation, Sale
                // We look for lines with 3 distinct numbers separated by spaces
                const numberPattern = /([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/;
                const match = line.match(numberPattern);
                if (match) {
                    const valuation = parseGreekNumber(match[2]); // Middle number is usually Valuation
                    
                    // Sanity check: is it a valid number line?
                    if (valuation !== null) {
                        totalInvestments += valuation;
                        await prisma.sectionEntry.create({
                            data: {
                                declarationId: declaration.id,
                                sectionType: SectionType.SECURITY,
                                holderRole: PersonRole.SUBJECT,
                                amount: valuation,
                                data: { raw: line, acquisition: match[1], valuation: match[2], sold: match[3] },
                                notes: "Investment Valuation"
                            }
                        });
                    }
                }
            }
            
            // --- REAL ESTATE COUNT ---
            else if (currentSection === SectionType.REAL_ESTATE) {
                if (line.includes('ΑΚΙΝΗΤΟ') && !line.includes('Ακίνητα και εμπράγματα')) {
                    realEstateCount++;
                }
            }
        }

        console.log("--- ANALYSIS RESULT ---");
        console.log(`Total Income: ${totalIncome.toFixed(2)}`);
        console.log(`Total Deposits: ${totalDeposits.toFixed(2)}`);
        console.log(`Total Investments (Est. Valuation): ${totalInvestments.toFixed(2)}`);
        console.log(`Real Estate Items: ${realEstateCount}`);
        
        await prisma.declaration.update({
            where: { id: declaration.id },
            data: {
                totalIncome: totalIncome,
                totalDeposits: totalDeposits,
                totalInvestments: totalInvestments,
                realEstateCount: realEstateCount
            }
        });
        console.log("Updated Declaration with totals.");

        } catch (e: any) {
            if (e.code === 'P2002') {
                console.log("Declaration already exists (skipping detail insert loop for safety).");
            } else {
                console.error("Error creating declaration:", e);
            }
        }

    } catch (err) {
        console.error("Error parsing/db:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
