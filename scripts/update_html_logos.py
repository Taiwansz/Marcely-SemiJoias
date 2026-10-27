import os

files = ['site/index.html', 'site/catalogo.html', 'site/produto.html', 'site/sobre.html']
base = r'C:\Users\stdma\projetos\Marcely - SemiJoias'

old_header = '<img src="assets/logo.png" alt="Marcely Oliveira Atelier" class="h-9 w-auto object-contain transition-transform group-hover:scale-105">'
new_header = '<img src="assets/logo-icon-transparent.png" alt="Marcely Oliveira Atelier" class="h-10 w-auto object-contain transition-transform group-hover:scale-105">'

old_footer = '<img src="assets/logo.png" alt="Marcely Oliveira" class="h-8 w-auto invert">'
new_footer = '<img src="assets/logo-icon-transparent.png" alt="Marcely Oliveira" class="h-9 w-auto object-contain">'

for rel in files:
    path = os.path.join(base, rel)
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    if 'favicon.png' not in c:
        c = c.replace('</title>', '</title>\n  <link rel="icon" type="image/png" href="assets/favicon.png">')

    c = c.replace(old_header, new_header)
    c = c.replace(old_footer, new_footer)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

    print('Successfully updated:', rel)
