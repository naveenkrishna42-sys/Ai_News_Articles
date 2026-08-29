import os

filepath = 'scripts/lib/template.mjs'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Mojibake
replacements = {
    'â€"': '—',
    'â€¹': '‹',
    'â€º': '›',
    'â€¢': '•',
    'â€˜': '‘',
    'â€™': '’',
    'â€œ': '“',
    'â€': '”',
    'â€°': '‰',
    'Â©': '©'
}

for bad, good in replacements.items():
    content = content.replace(bad, good)

# Add Cuelinks Meta tag
cuelinks_tag = '\n<meta name="cuelinks-verification" content="VERIFY-CL-RMCNURET">'
if 'name="cuelinks-verification"' not in content:
    content = content.replace('<head>', f'<head>{cuelinks_tag}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Mojibake and added Cuelinks to template.mjs")
