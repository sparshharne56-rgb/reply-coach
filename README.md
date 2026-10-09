# Small Talk Club

A browser-based conversation coach. Add a chat screenshot for on-device OCR, paste a conversation, write the thought you want to get across, and get editable reply starters in a few tones.

## Run it

Open `index.html` in a browser. No build step or account is required.

Screenshot OCR loads Tesseract.js and English language data from jsDelivr the first time you use it, so OCR needs an internet connection. Image recognition runs in your browser; screenshots and chat text are not sent to an application server. Pasting the conversation works offline.

The reply suggestions use simple local patterns, not a hosted AI model. They are conversation starters to edit into your own words.