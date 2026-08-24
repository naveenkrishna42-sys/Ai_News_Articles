import re, os
files = [f for f in os.listdir("articles") if f.endswith(".html")]
for f in files[:5]:
    html = open("articles/" + f, encoding="utf-8").read()
    m = re.search(r'<span class="cat-pill">([^<]+)</span>', html)
    print(f, m.group(1) if m else "Not found")
