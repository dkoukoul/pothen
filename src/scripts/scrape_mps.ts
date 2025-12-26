
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

const prisma = new PrismaClient();
const BASE_URL = 'https://www.hellenicparliament.gr';

async function fetchPage(url: string) {
    // console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const html = await response.text();
    return cheerio.load(html);
}

// Function to normalize Greek strings for comparison (remove accents, uppercase)
function normalize(str: string) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

async function main() {
    const partiesEnv = process.env.PARTIES;
    console.log("RAW PARTIES ENV:", partiesEnv);
    if (!partiesEnv) {
        console.error("PARTIES environment variable not found.");
        process.exit(1);
    }

    const partyDefs = partiesEnv.split(',').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Found ${partyDefs.length} parties to process.`);

    for (const def of partyDefs) {
        // Parse "KEY=Name" or just "KEY"
        const parts = def.split('=');
        const key = parts[0]?.trim();
        const explicitName = parts[1]?.trim();
        
        if (!key) continue;

        const partyName = explicitName ? explicitName : key;
        const url = process.env[key];

        if (!url) {
            console.warn(`No URL found for party key: ${key} (Expected env var based on PARTIES list)`);
            continue;
        }

        console.log(`\n=== Processing Party: ${partyName} (${key}) ===`);
        console.log(`URL: ${url}`);

        let currentUrl = url;
        let pageCount = 0;

        try {
            while (currentUrl) {
                pageCount++;
                const $ = await fetchPage(currentUrl);
                
                // Selector for MP rows.
                const rows = $('table.grid tbody tr');
                
                if (rows.length === 0) {
                    console.log(`No rows found on page ${pageCount} for party ${partyName}.`);
                } else {
                     console.log(`Found ${rows.length} rows on page ${pageCount}.`);
                }

                await processRows($, rows, partyName);

                // Pagination: Look for a "Next" link. 
                // We iterate over all links in the paging container to find the one that looks like "Next"
                let nextLinkText: string | undefined;
                
                const pagingLinks = $('.in_paging a, .paging a');
                pagingLinks.each((i, el) => {
                    const t = $(el).text().trim();
                    if (t === '>' || t === 'Επόμενη' || t === 'Next' || t.includes('Επόμενη') || t.includes('>')) {
                        nextLinkText = $(el).attr('href');
                        return false; // break
                    }
                });

                if (!nextLinkText) {
                    // Fallback: try to find any link with text ">" globally if specific container failed
                     const globNext = $('a').filter((i, el) => $(el).text().trim() === '>').first();
                     if (globNext.length) nextLinkText = globNext.attr('href');
                }

                if (nextLinkText) {
                    if (nextLinkText.startsWith('http')) {
                        currentUrl = nextLinkText;
                    } else {
                        // Check if it starts with / or ?
                        if (nextLinkText.startsWith('/')) {
                             currentUrl = new URL(nextLinkText, BASE_URL).toString();
                        } else {
                            // Relative to current? Or Base? Usually root relative on this site but let's be safe
                             currentUrl = new URL(nextLinkText, BASE_URL).toString();
                        }
                    }
                    console.log(`Next page found: ${currentUrl}`);
                } else {
                    console.log("No next page found. Finishing party.");
                    currentUrl = '';
                }
                
                if (pageCount > 20) break;
            }
        } catch(e) {
            console.error(`Error processing party ${partyName}:`, e);
        }
    }
}

// Helper to process rows
async function processRows($: cheerio.CheerioAPI, rows: any, partyName: string) {
     const allPeople = await prisma.person.findMany();

     for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cols = $(row).find('td');
        if (cols.length < 3) continue;

        const nameCol = $(cols[0]).text().trim();
        const region = $(cols[1]).text().trim();
        const fullName = normalize(nameCol);

        if (fullName.includes('KAZAKOS') || fullName.includes('ONOMATEPONYMO')) continue;

        let matchedPerson = null;
        for (const p of allPeople) {
            const dbFull = normalize(`${p.lastName} ${p.firstName}`);
            const dbFullRev = normalize(`${p.firstName} ${p.lastName}`);
            const webFull = normalize(nameCol);

            // Exact match (Last First or First Last)
            if (dbFull === webFull || dbFullRev === webFull) {
                matchedPerson = p;
                break;
            }
            // Fuzzy/Partial match
            // Check if BOTH last name and first name (from DB) appear in the Web Name
            // This handles cases like "MITSOTAKIS KYRIAKOS TOY KONSTANTINOY" vs "MITSOTAKIS KYRIAKOS"
            // Note: DB names are "MITSOTAKIS" "KYRIAKOS".
            const dbLast = normalize(p.lastName);
            const dbFirst = normalize(p.firstName);
            
            if (webFull.includes(dbLast) && webFull.includes(dbFirst)) {
                 matchedPerson = p;
                break;
            }
        }

        if (matchedPerson) {
            console.log(`-> Matched: ${matchedPerson.firstName} ${matchedPerson.lastName} -> ${partyName}, ${region}`);
            await prisma.person.update({
                where: { id: matchedPerson.id },
                data: {
                    party: partyName,
                    region: region
                }
            });
        } else {
             // console.log(`-> No match in DB for ${nameCol}`); 
             // Reduce noise
        }
     }
}


main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
