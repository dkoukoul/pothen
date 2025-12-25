#!/bin/bash

# --- Configuration ---
PAGE_URL="https://www.hellenicparliament.gr/Organosi-kai-Leitourgia/epitropi-elegxou-ton-oikonomikon-ton-komaton-kai-ton-vouleftwn/Diloseis-Periousiakis-Katastasis2024/Ethsies-Diloseis-Periousiakis-Katastasis2024"
BASE_DOMAIN="https://www.hellenicparliament.gr"
DOWNLOAD_DIR="hellenic_parliament_pdfs"

# --- Script Logic ---

# 1. Create a directory for the downloads and move into it
mkdir -p "$DOWNLOAD_DIR"
cd "$DOWNLOAD_DIR"

echo "Starting PDF download from: $PAGE_URL"
echo "Files will be saved in the '$DOWNLOAD_DIR' directory."

# 2. Fetch the HTML content and extract the PDF links
# - curl -sL: fetch silently, follow redirects
# - grep -oP: extract only the matching pattern (-o), using PCRE (-P)
# - 'href="\K[^"]+\.pdf': regex to find a link that ends in .pdf,
#   using \K to only keep the URL itself (not the 'href="')
curl -sL "$PAGE_URL" | 
grep -oP 'href="\K[^"]+\.pdf' | 

# 3. Loop through each extracted link path
while IFS= read -r PATH_TO_PDF; do
    
    DOWNLOAD_URL=""

    if [[ "$PATH_TO_PDF" == http* ]]; then
        # Link is already an absolute URL (starts with http)
        DOWNLOAD_URL="$PATH_TO_PDF"
    elif [[ "$PATH_TO_PDF" == /* ]]; then
        # Link is root-relative (starts with /), prepend the base domain
        DOWNLOAD_URL="${BASE_DOMAIN}${PATH_TO_PDF}"
    else
        # Fallback for simple relative paths (less common for a URL like this)
        DOWNLOAD_URL="${BASE_DOMAIN}/$PATH_TO_PDF"
    fi

    # 4. Download the file
    echo "Downloading: $DOWNLOAD_URL"
    # -q: quiet (suppress standard output)
    # -nc: no clobber (don't overwrite existing files)
    # --content-disposition: use filename suggested by the server in the header
    wget -q -nc --content-disposition "$DOWNLOAD_URL"

done

echo "Finished. All available PDF files have been downloaded or skipped if they already existed."