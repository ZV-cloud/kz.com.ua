"""Тимчасовий скрипт: завантажує PDF публікацій із сайтів журналів (запускається в GitHub Actions).
Для кожного джерела пробує адреси по черзі; якщо отримує HTML-сторінку статті,
шукає на ній посилання на PDF (citation_pdf_url, /download/, .pdf). Результат — у теці _zavantazhennya/syri/.
"""
import json
import pathlib
import re
import subprocess
import urllib.parse

import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings()
HERE = pathlib.Path(__file__).parent
OUT = HERE / "syri"
OUT.mkdir(exist_ok=True)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept": "text/html,application/pdf,*/*;q=0.8",
                  "Accept-Language": "uk,en;q=0.8"})


def get(url):
    for verify in (True, False):
        try:
            r = S.get(url, timeout=90, allow_redirects=True, verify=verify)
            return r
        except requests.exceptions.SSLError:
            continue
        except Exception as exc:  # noqa: BLE001
            return exc
    return None


def pdf_links(html, base):
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for m in soup.find_all("meta", attrs={"name": "citation_pdf_url"}):
        if m.get("content"):
            found.append(m["content"])
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if re.search(r"\.pdf($|\?)", h, re.I) or "/download/" in h or "/article/view/" in h and "/" in h.split("/article/view/")[-1]:
            found.append(h)
    # Google Drive: підтвердження великого файлу
    for f in soup.find_all("form", action=True):
        if "drive.usercontent.google.com" in f["action"]:
            params = {i["name"]: i.get("value", "") for i in f.find_all("input", attrs={"name": True})}
            found.append(f["action"] + "?" + urllib.parse.urlencode(params))
    out, seen = [], set()
    for h in found:
        u = urllib.parse.urljoin(base, h)
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out[:8]


def try_url(url, depth, log):
    r = get(url)
    if not isinstance(r, requests.Response):
        log.append({"url": url, "error": str(r)})
        return None, None
    entry = {"url": url, "final": r.url, "status": r.status_code,
             "type": r.headers.get("content-type", ""), "bytes": len(r.content)}
    log.append(entry)
    if r.status_code == 200 and r.content[:5] == b"%PDF-":
        return r.content, r.url
    if r.status_code == 200 and depth < 2 and b"<" in r.content[:2000]:
        for link in pdf_links(r.text, r.url):
            data, final = try_url(link, depth + 1, log)
            if data:
                return data, final
        return None, r.text
    return None, None


def print_pdf(url, dest):
    for exe in ("google-chrome", "chromium-browser", "chromium"):
        try:
            subprocess.run([exe, "--headless=new", "--no-sandbox", "--disable-gpu",
                            f"--print-to-pdf={dest}", "--no-pdf-header-footer", url],
                           check=True, timeout=120, capture_output=True)
            return dest.exists() and dest.stat().st_size > 1000
        except Exception:  # noqa: BLE001
            continue
    return False


def main():
    sources = json.loads((HERE / "dzherela.json").read_text(encoding="utf-8"))
    report = {}
    for src in sources:
        sid, log = src["id"], []
        result = {"ok": False, "log": log}
        if src.get("print"):
            ok = print_pdf(src["urls"][0], OUT / f"{sid}.pdf")
            result.update(ok=ok, source=src["urls"][0], how="print")
        else:
            last_html = None
            for url in src["urls"]:
                data, extra = try_url(url, 0, log)
                if data:
                    (OUT / f"{sid}.pdf").write_bytes(data)
                    result.update(ok=True, source=extra, bytes=len(data))
                    break
                if isinstance(extra, str):
                    last_html = extra
            if not result["ok"] and last_html:
                (OUT / f"{sid}.html").write_text(last_html, encoding="utf-8")
        report[sid] = result
        print(sid, "OK" if result["ok"] else "FAIL", result.get("source", ""))
    (HERE / "zvit.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
