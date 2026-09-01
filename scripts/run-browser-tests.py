#!/usr/bin/env python3
import json, os, shutil, subprocess, sys, tempfile, time
from urllib.parse import quote
import requests
import websocket

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
HTTP_PORT = 8765
DEBUG_PORT = 9222
PROFILE = tempfile.mkdtemp(prefix='snippets-chrome-')
server = chrome = None
ws = None
counter = 0

def send(method, params=None):
    global counter
    counter += 1
    ident = counter
    ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
    deadline = time.time() + 5
    while time.time() < deadline:
        msg = json.loads(ws.recv())
        if msg.get('id') == ident:
            return msg
    raise TimeoutError(method)

def evaluate(expression):
    res = send('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
    return res.get('result', {}).get('result', {}).get('value')

try:
    server = subprocess.Popen(
        [sys.executable, '-m', 'http.server', str(HTTP_PORT), '--bind', '127.0.0.1'],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    chrome = subprocess.Popen([
        'chromium', '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--disable-background-networking', '--disable-component-update', '--no-first-run',
        f'--remote-debugging-port={DEBUG_PORT}', f'--user-data-dir={PROFILE}', '--remote-allow-origins=*',
        'about:blank'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    version_url = f'http://127.0.0.1:{DEBUG_PORT}/json/version'
    for _ in range(60):
        try:
            if requests.get(version_url, timeout=.2).ok:
                break
        except Exception:
            time.sleep(.1)
    else:
        raise RuntimeError('Chromium debugging endpoint did not start')

    target_url = f'http://127.0.0.1:{HTTP_PORT}/tests/browser-tests.html'
    target = requests.put(f'http://127.0.0.1:{DEBUG_PORT}/json/new?{quote(target_url, safe=":/?=&")}', timeout=2).json()
    ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=2)
    send('Runtime.enable')
    send('Page.enable')

    deadline = time.time() + 8
    status = None
    while time.time() < deadline:
        try:
            status = evaluate('document.documentElement.dataset.tests || "running"')
            if status in ('pass', 'fail'):
                break
        except Exception:
            pass
        time.sleep(.1)

    log = evaluate('document.querySelector("#test-log")?.textContent || ""') or ''
    summary = evaluate('document.querySelector("#test-summary")?.textContent || "NO SUMMARY"')
    print(log, end='')
    print(summary)
    if status != 'pass':
        sys.exit(1)
finally:
    try:
        if ws: ws.close()
    except Exception:
        pass
    for proc in (chrome, server):
        if proc and proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=2)
            except subprocess.TimeoutExpired: proc.kill()
    shutil.rmtree(PROFILE, ignore_errors=True)
