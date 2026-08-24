import re
path = 'scripts/build-index.mjs'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# The text has `extract(html, /...something...\s*([^<]+)</, "General")`
text = re.sub(r'extract\(html,\s*/.*?\\s\*\(\[\^<\]\+\)</,\s*"General"\)', r'extract(html, /<span class="cat-pill">([^<]+)<\\/span>/, "General")', text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
