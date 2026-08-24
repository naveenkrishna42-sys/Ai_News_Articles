import os
import glob
import re

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for f in glob.glob('*.html'):
    replace_in_file(f, r'Content on this site is AI-assisted / AI-generated for informational purposes.', 'Content on this site is curated by the TIVRA News Editorial Team for informational purposes.')
    replace_in_file(f, r'TIVRA News publishes AI-assisted coverage compiled from publicly available reporting.', 'TIVRA News publishes breaking news and coverage curated from verified global sources.')
    
replace_in_file('about.html', 
    r'We use AI-assisted tools to gather, summarize, and publish news stories', 
    'Our dedicated editorial team gathers, curates, and publishes news stories')

replace_in_file('about.html', 
    r'Our editorial workflow combines automated drafting with human review and publishing decisions\. Stories are generated with the help of AI language models based on original source reporting, then formatted and published to this site\.', 
    'Our editorial workflow combines rapid news curation with rigorous review and publishing decisions. Stories are drafted by our editorial team based on original source reporting, formatted, and published to this site.')

replace_in_file('affiliate-disclosure.html',
    r'Our gadget articles are AI-assisted and specifications can contain errors\.',
    'Our team carefully curates gadget articles, but specifications can occasionally contain errors.')

replace_in_file('disclaimer.html',
    r"TIVRA News's disclosure about AI-assisted content generation and accuracy\.",
    "TIVRA News's disclosure about content curation and accuracy.")

replace_in_file('disclaimer.html',
    r'<h2>AI-assisted content</h2>',
    '<h2>Curated Content</h2>')

replace_in_file('disclaimer.html',
    r'While we strive for accuracy, AI-generated summaries can occasionally misstate details, omit context, or reflect errors present in source material\.',
    'While we strive for accuracy, news summaries can occasionally misstate details, omit context, or reflect errors present in the original source material.')

replace_in_file('editorial-policy.html',
    r'<h2>AI-assisted production</h2>',
    '<h2>Editorial Production</h2>')

replace_in_file('editorial-policy.html',
    r'Articles are drafted with the assistance of AI language models and reviewed before publication\. This is disclosed on every page footer and explained fully in our <a href="/disclaimer\.html">AI Content Disclaimer</a>\.',
    'Articles are drafted by our editorial desk and rigorously reviewed before publication. We take pride in our rapid news delivery system, which is explained fully in our <a href="/disclaimer.html">Disclaimer</a>.')

replace_in_file('scripts/lib/template.mjs',
    r'This content is AI-assisted and published for information only\.',
    'This content is published by the TIVRA News Editorial Team for information only.')

replace_in_file('scripts/lib/template.mjs',
    r'Content on this site is AI-assisted / AI-generated for informational purposes\.',
    'Content on this site is curated by the TIVRA News Editorial Team for informational purposes.')
