#!/usr/bin/env python3
"""多語系工具：找出 JS 裡含中文的字串，包成 $t`…` 標籤樣板，並檢查英文字典。

用法：
  python3 tools/i18n.py wrap      把 js/*.js 裡含中文的字串／樣板包上 $t``（可重複執行）
  python3 tools/i18n.py keys      列出所有翻譯鍵（JSON）
  python3 tools/i18n.py check     檢查 js/i18n-en.js：缺少的翻譯、用不到的條目、佔位符與 HTML 標籤是否一致

翻譯鍵就是中文原文：樣板裡的 ${…} 一律寫成 {}；英文若要調整順序可以寫 {0}、{1}…
"""
import json, re, sys, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CJK = re.compile(r'[㐀-鿿豈-﫿]')
SKIP_FILES = {'i18n.js', 'i18n-en.js'}
KW_BEFORE_REGEX = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await'}


def cook(raw):
    """把 JS 字串的跳脫序列轉成實際字元（只處理常見的）"""
    out, i = [], 0
    while i < len(raw):
        c = raw[i]
        if c == '\\' and i + 1 < len(raw):
            n = raw[i + 1]
            if n == 'n': out.append('\n'); i += 2
            elif n == 't': out.append('\t'); i += 2
            elif n == 'u' and raw[i + 2:i + 3] == '{':
                j = raw.index('}', i); out.append(chr(int(raw[i + 3:j], 16))); i = j + 1
            elif n == 'u': out.append(chr(int(raw[i + 2:i + 6], 16))); i += 6
            elif n == 'x': out.append(chr(int(raw[i + 2:i + 4], 16))); i += 4
            elif n == '\n': i += 2
            else: out.append(n); i += 2
        else:
            out.append(c); i += 1
    return ''.join(out)


class Lexer:
    def __init__(self, src):
        self.s = src; self.lits = []; self.last = ''  # last significant token text

    def run(self):
        self.code(0, False); return self.lits

    def code(self, i, in_tpl):
        s = self.s; depth = 0
        while i < len(s):
            c = s[i]
            if c in ' \t\r\n': i += 1; continue
            if s.startswith('//', i): i = s.find('\n', i); i = len(s) if i < 0 else i; continue
            if s.startswith('/*', i): i = s.index('*/', i) + 2; continue
            if c in '\'"': i = self.string(i); self.last = 'lit'; continue
            if c == '`': i = self.template(i); self.last = 'lit'; continue
            if c == '/':
                prev = self.last
                if prev and (re.match(r'[\w$]', prev[-1]) and prev not in KW_BEFORE_REGEX or prev in (')', ']', 'lit')):
                    i += 1; self.last = '/'; continue  # 除號
                i = self.regex(i); self.last = 'lit'; continue
            if c == '{': depth += 1; self.last = c; i += 1; continue
            if c == '}':
                if in_tpl and depth == 0: return i + 1
                depth -= 1; self.last = c; i += 1; continue
            m = re.match(r'[\w$]+', s[i:])
            if m: self.last = m.group(0); i += len(m.group(0)); continue
            self.last = c; i += 1
        return i

    def string(self, i):
        q = self.s[i]; j = i + 1
        while self.s[j] != q:
            j += 2 if self.s[j] == '\\' else 1
        raw = self.s[i + 1:j]
        self.lits.append({'kind': 'str', 'start': i, 'end': j + 1, 'raw': raw, 'key': cook(raw)})
        return j + 1

    def regex(self, i):
        j = i + 1; cls = False
        while True:
            c = self.s[j]
            if c == '\\': j += 2; continue
            if c == '[': cls = True
            elif c == ']': cls = False
            elif c == '/' and not cls: break
            j += 1
        j += 1
        while j < len(self.s) and re.match(r'[a-z]', self.s[j]): j += 1
        return j

    def template(self, i):
        s = self.s; j = i + 1; parts = []; buf_start = j; segs = []
        rec = {'kind': 'tpl', 'start': i}
        while True:
            c = s[j]
            if c == '\\': j += 2; continue
            if c == '`':
                parts.append(s[buf_start:j]); segs.append(('s', s[buf_start:j])); j += 1; break
            if s.startswith('${', j):
                parts.append(s[buf_start:j]); segs.append(('s', s[buf_start:j]))
                saved = self.last; self.last = '{'; e0 = j
                j = self.code(j + 2, True)
                segs.append(('e', s[e0:j]))
                self.last = saved; buf_start = j; continue
            j += 1
        rec['end'] = j; rec['parts'] = parts; rec['segs'] = segs; rec['key'] = '{}'.join(cook(p) for p in parts)
        self.lits.append(rec)
        return j


def js_files():
    return [f for f in sorted(glob.glob(os.path.join(ROOT, 'js', '*.js'))) if os.path.basename(f) not in SKIP_FILES]


def prev_sig(s, i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\r\n': j -= 1
    return s[j] if j >= 0 else '', j


def next_sig(s, i):
    j = i
    while j < len(s) and s[j] in ' \t\r\n': j += 1
    return s[j] if j < len(s) else ''


def scan(f):
    src = open(f, encoding='utf8').read()
    out = []
    for L in Lexer(src).run():
        if not CJK.search(L['key']): continue
        p, pj = prev_sig(src, L['start'])
        n = next_sig(src, L['end'])
        word = re.search(r'[\w$]+$', src[:pj + 1]) if pj >= 0 else None
        L['tagged'] = L['kind'] == 'tpl' and word is not None and word.group(0) not in KW_BEFORE_REGEX
        L['objkey'] = L['kind'] == 'str' and p in '{,' and p != '' and n == ':'
        L['line'] = src.count('\n', 0, L['start']) + 1
        out.append(L)
    return src, out


def cmd_wrap():
    total = 0
    for f in js_files():
        src, lits = scan(f)
        edits = []
        for L in lits:
            if L['objkey']:
                print(f'  略過物件鍵 {os.path.basename(f)}:{L["line"]} {L["key"]!r}'); continue
            if L['tagged']: continue
            if L['kind'] == 'tpl':
                edits.append((L['start'], L['start'], '$t'))
            else:
                body = L['raw'].replace('`', '\\`').replace('${', '\\${')
                if L['raw'] and src[L['start']] == '"': body = body.replace('\\"', '"')
                else: body = body.replace("\\'", "'")
                edits.append((L['start'], L['end'], '$t`' + body + '`'))
        for a, b, txt in sorted(edits, key=lambda e: -e[0]):
            src = src[:a] + txt + src[b:]
        if edits:
            open(f, 'w', encoding='utf8').write(src); total += len(edits)
            print(f'{os.path.basename(f)}: {len(edits)}')
    print('wrapped', total)


def split_tpl(segs):
    """把含 HTML 的樣板改成「每段標籤之間的文字各自翻譯」"""
    out = []; run = []; in_tag = False

    def flush():
        raw = ''.join(r for _, r in run); stat = ''.join(r for k, r in run if k == 's'); run.clear()
        if CJK.search(stat):
            m = re.match(r'^(\s*)(.*?)(\s*)$', raw, re.S)
            out.append(m.group(1) + '${$t`' + m.group(2) + '`}' + m.group(3))
        else:
            out.append(raw)
    for kind, raw in segs:
        if kind == 'e':
            if in_tag: out.append(raw)
            else: run.append((kind, raw))
            continue
        i = 0
        while i < len(raw):
            if in_tag:
                j = raw.find('>', i)
                if j < 0: out.append(raw[i:]); break
                out.append(raw[i:j + 1]); i = j + 1; in_tag = False
            else:
                j = raw.find('<', i)
                if j < 0: run.append(('s', raw[i:])); break
                run.append(('s', raw[i:j])); flush(); in_tag = True; i = j
    if run: flush()
    return ''.join(out)


def cmd_split():
    total = 0
    for f in js_files():
        src = open(f, encoding='utf8').read(); n = 0
        while True:  # 每改一個就重新掃描，巢狀樣板的位置才會正確
            lits = [L for L in Lexer(src).run() if L['kind'] == 'tpl' and src[L['start'] - 2:L['start']] == '$t'
                    and re.search(r'<[a-zA-Z/]', ''.join(L['parts'])) and CJK.search(L['key'])]
            if not lits: break
            L = lits[0]
            src = src[:L['start'] - 2] + '`' + split_tpl(L['segs']) + '`' + src[L['end']:]
            n += 1
        if n: open(f, 'w', encoding='utf8').write(src); print(f'{os.path.basename(f)}: {n}'); total += n
    print('split', total)


UNTAGGED = []


def all_keys():
    keys = {}
    for f in js_files():
        _, lits = scan(f)
        src = open(f, encoding='utf8').read()
        for L in lits:
            if L['objkey']: continue
            where = f'{os.path.basename(f)}:{L["line"]}'
            if L['kind'] == 'tpl' and src[L['start'] - 2:L['start']] == '$t': keys.setdefault(L['key'], where)
            elif L['kind'] == 'tpl' and src[L['start'] - 4:L['start']] == '$raw': pass
            else: UNTAGGED.append((where, L['key']))
    # index.html 的靜態文字（啟動時由 i18nDom 翻譯）
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read()
    html = re.sub(r'<script.*?</script>', '', html, flags=re.S)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    for m in re.finditer(r'>([^<>]*)<', html):
        tx = ' '.join(m.group(1).split())
        if CJK.search(tx): keys.setdefault(tx, 'index.html')
    for m in re.finditer(r'(?:title|aria-label|placeholder)="([^"]*)"', html):
        if CJK.search(m.group(1)): keys.setdefault(m.group(1), 'index.html')
    return keys


def load_en():
    p = os.path.join(ROOT, 'js', 'i18n-en.js')
    if not os.path.exists(p): return {}
    s = open(p, encoding='utf8').read()
    s = s[s.index('const EN='):]; return json.loads(s[s.index('{'):s.rindex('}') + 1])


def tags(s): return sorted(re.findall(r'</?[a-zA-Z][^>]*?>', s))


def holes(s): return len(re.findall(r'\{\d*\}', s))


def cmd_check(verbose=True):
    keys, en = all_keys(), load_en()
    missing = [k for k in keys if k not in en]
    unused = [k for k in en if k not in keys]
    bad = []
    for k, v in en.items():
        if k not in keys: continue
        if holes(k) != holes(v): bad.append((k, v, 'placeholders'))
        elif [re.sub(r'\s+', ' ', t) for t in tags(k)] != [re.sub(r'\s+', ' ', t) for t in tags(v)]: bad.append((k, v, 'html tags'))
        elif CJK.search(v): bad.append((k, v, 'still has CJK'))
    print(f'keys {len(keys)}  translated {len(keys) - len(missing)}  missing {len(missing)}  unused {len(unused)}  problems {len(bad)}')
    if verbose:
        for w, k in UNTAGGED: print('UNTAGGED', w, json.dumps(k[:80], ensure_ascii=False))
        for k in missing: print('MISSING', keys[k], json.dumps(k, ensure_ascii=False))
        for k in unused: print('UNUSED ', json.dumps(k, ensure_ascii=False))
        for k, v, why in bad: print('BAD    ', why, json.dumps(k, ensure_ascii=False), '=>', json.dumps(v, ensure_ascii=False))
    return not missing and not bad


if __name__ == '__main__':
    c = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if c == 'wrap': cmd_wrap()
    elif c == 'split': cmd_split()
    elif c == 'keys': print(json.dumps(all_keys(), ensure_ascii=False, indent=1))
    elif c == 'check': sys.exit(0 if cmd_check() else 1)
