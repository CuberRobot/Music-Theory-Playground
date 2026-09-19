#!/usr/bin/env python3
"""MuseScore 插件桥的最小客户端（只用标准库，不装任何依赖）。

MuseScore 里跑着 musescore-mcp-websocket 插件时，它会在 8765 端口开一个
WebSocket 服务。这个脚本负责握手、发一条 JSON 命令、把结果打印出来。

用法：
    python3 msc_bridge.py '{"action":"ping"}'
    python3 msc_bridge.py '{"action":"getCursorInfo"}'
"""

import base64
import json
import os
import socket
import struct
import sys

HOST = "127.0.0.1"
PORT = 8765


def connect(host=HOST, port=PORT, timeout=10):
    s = socket.create_connection((host, port), timeout=timeout)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET / HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            raise RuntimeError("服务端在握手阶段就断开了")
        buf += chunk
    head, _, rest = buf.partition(b"\r\n\r\n")
    if b"101" not in head.split(b"\r\n")[0]:
        raise RuntimeError("握手失败：" + head.decode(errors="replace"))
    return s, rest


def send_text(s, text):
    payload = text.encode()
    header = bytearray([0x81])                       # FIN + 文本帧
    mask = os.urandom(4)
    n = len(payload)
    if n < 126:
        header.append(0x80 | n)
    elif n < 65536:
        header.append(0x80 | 126)
        header += struct.pack(">H", n)
    else:
        header.append(0x80 | 127)
        header += struct.pack(">Q", n)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    s.sendall(bytes(header) + mask + masked)


def recv_text(s, buffered=b"", timeout=15):
    """读一条完整的文本帧（MuseScore 每次只回一条，长度一般不长）。"""
    s.settimeout(timeout)
    data = buffered

    def need(n):
        nonlocal data
        while len(data) < n:
            chunk = s.recv(65536)
            if not chunk:
                raise RuntimeError("连接被关闭")
            data += chunk

    need(2)
    b1, b2 = data[0], data[1]
    length = b2 & 0x7F
    offset = 2
    if length == 126:
        need(4)
        length = struct.unpack(">H", data[2:4])[0]
        offset = 4
    elif length == 127:
        need(10)
        length = struct.unpack(">Q", data[2:10])[0]
        offset = 10
    if b2 & 0x80:                                    # 理论上服务端不加掩码
        need(offset + 4)
        mask = data[offset:offset + 4]
        offset += 4
    need(offset + length)
    payload = data[offset:offset + length]
    if b2 & 0x80:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    return payload.decode(errors="replace"), data[offset + length:]


def call(command, host=HOST, port=PORT):
    s, rest = connect(host, port)
    try:
        send_text(s, json.dumps(command, ensure_ascii=False))
        text, _ = recv_text(s, rest)
        return json.loads(text)
    finally:
        s.close()


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else '{"action":"ping"}'
    cmd = json.loads(arg)
    print(json.dumps(call(cmd), ensure_ascii=False, indent=2))
