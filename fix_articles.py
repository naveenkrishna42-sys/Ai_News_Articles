import glob
import re

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

count = 0
for f in glob.glob('articles/*.html'):
    replace_in_file(f, r'Content on this site is AI-assisted / AI-generated for informational purposes.', 'Content on this site is curated by the TIVRA News Editorial Team for informational purposes.')
    replace_in_file(f, r'This content is AI-assisted and published for information only.', 'This content is published by the TIVRA News Editorial Team for information only.')
    count += 1

print(f"Processed {count} articles")
