#!/usr/bin/env python3
"""本地开发服务器：比 http.server 多一件事 —— 禁止缓存。

python 自带的 http.server 不发 Cache-Control，浏览器于是按启发式规则
自行决定缓存多久（一般是"距 Last-Modified 到现在"的 10%，对改了半天的
文件就是几十分钟）。改完代码刷新看不到变化，根因就在这里 ——
不是代码没生效，是浏览器压根没去要新文件。

开发时一律 no-store 最省事：每次刷新都拿最新的。
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 只报错误，别把每个请求都刷出来
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f"Music Theory Playground → http://localhost:{port}/  （已禁用缓存）", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
