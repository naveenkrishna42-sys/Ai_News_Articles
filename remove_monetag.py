import os
import glob

script_to_remove = '<script src="https://quge5.com/88/tag.min.js" data-zone="272630" async data-cfasync="false"></script>'

def remove_from_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if script_to_remove in content:
            new_content = content.replace(script_to_remove + '\n', '').replace(script_to_remove, '')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        pass
    return False

count = 0
files_to_check = glob.glob('*.html') + glob.glob('scripts/lib/*.mjs') + glob.glob('articles/*.html')

for f in files_to_check:
    if remove_from_file(f):
        count += 1

print(f"Removed Monetag from {count} files")
