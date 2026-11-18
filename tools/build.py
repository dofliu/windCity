#!/usr/bin/env python3
"""把 index.html + css/ + js/ 內嵌成單一 HTML。

用法：
  python3 tools/build.py            # 產生 dist/windcity.html（完整單檔，可離線開啟）
  python3 tools/build.py --artifact # 產生 dist/artifact.html（給 claude.ai Artifact 發布用，不含 doctype/head 外殼）
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
def inline_css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '</style>'
def inline_js(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '</script>'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
out = root / 'dist'
out.mkdir(exist_ok=True)
if '--artifact' in sys.argv:
    # Artifact 發布時平台會自動包上 doctype/head/body，這裡只留下內容
    html = re.sub(r'^.*?<head>\s*', '', html, flags=re.S)
    html = re.sub(r'<meta charset="utf-8">\s*', '', html)
    html = re.sub(r'<meta name="viewport"[^>]*>\s*', '', html)
    html = html.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
    (out / 'artifact.html').write_text(html, encoding='utf-8')
    print('dist/artifact.html', len(html))
else:
    (out / 'windcity.html').write_text(html, encoding='utf-8')
    print('dist/windcity.html', len(html))
