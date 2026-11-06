"""PhonePad - servidor para Windows: recebe o celular e cria um controle de Xbox 360 virtual."""
import asyncio, json, os, socket, subprocess, sys, threading
import tkinter as tk
from aiohttp import web, WSMsgType
import vgamepad as vg

if sys.stdout is None: sys.stdout = open(os.devnull, "w")
if sys.stderr is None: sys.stderr = open(os.devnull, "w")

PORT, MAX_PADS = 8765, 4
players = {}                      # slot -> IP do celular
status = {"err": None}

def resource(rel):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base, rel)

def i16(v): return int(max(-1.0, min(1.0, float(v))) * 32767)
def u8(v): return int(max(0.0, min(1.0, float(v))) * 255)

def apply_state(pad, m):
    r = pad.report                # os bits de "b" já são os do XInput
    r.wButtons = int(m.get("b", 0)) & 0xFFFF
    r.bLeftTrigger, r.bRightTrigger = u8(m.get("lt", 0)), u8(m.get("rt", 0))
    r.sThumbLX, r.sThumbLY = i16(m.get("lx", 0)), i16(m.get("ly", 0))
    r.sThumbRX, r.sThumbRY = i16(m.get("rx", 0)), i16(m.get("ry", 0))
    pad.update()

async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=8, max_msg_size=4096)
    await ws.prepare(request)
    slot = next((i for i in range(MAX_PADS) if i not in players), None)
    if slot is None:
        await ws.send_json({"t": "full"}); await ws.close(); return ws
    try:
        pad = vg.VX360Gamepad()
    except Exception:
        await ws.send_json({"t": "err", "m": "Driver ViGEmBus não encontrado no PC."})
        await ws.close(); return ws
    loop = asyncio.get_running_loop()
    def rumble(client, target, large, small, led, user_data):
        if not ws.closed:
            asyncio.run_coroutine_threadsafe(ws.send_json({"t": "rumble", "l": int(large), "s": int(small)}), loop)
    try: pad.register_notification(callback_function=rumble)
    except Exception: pass
    players[slot] = request.remote
    await ws.send_json({"t": "hello", "slot": slot})
    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try: m = json.loads(msg.data)
                except ValueError: continue
                if m.get("t") == "s": apply_state(pad, m)
    finally:
        players.pop(slot, None)
        try: pad.unregister_notification()
        except Exception: pass
        try: pad.reset(); pad.update()
        except Exception: pass
        del pad                   # desconecta o controle virtual
    return ws

async def index(_): return web.FileResponse(resource("www/index.html"))

def serve():
    loop = asyncio.new_event_loop(); asyncio.set_event_loop(loop)
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/", index)
    app.router.add_static("/", resource("www"))
    runner = web.AppRunner(app)
    try:
        loop.run_until_complete(runner.setup())
        loop.run_until_complete(web.TCPSite(runner, "0.0.0.0", PORT).start())
    except Exception as e:
        status["err"] = f"Não abriu a porta {PORT}: {e}"; return
    loop.run_forever()

def local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("10.255.255.255", 1)); ips.append(s.getsockname()[0]); s.close()
    except OSError: pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not ip.startswith("127.") and ip not in ips: ips.append(ip)
    except OSError: pass
    return ips or ["127.0.0.1"]

def gui():
    root = tk.Tk(); root.title("PhonePad"); root.resizable(False, False)
    ips = local_ips()
    tk.Label(root, text="PhonePad", font=("Segoe UI", 20, "bold")).pack(pady=(14, 0))
    tk.Label(root, text="No app do celular, digite o IP:").pack()
    tk.Label(root, text="   ".join(ips), font=("Segoe UI", 16, "bold"), fg="#b45309").pack()
    try:
        import qrcode
        from PIL import ImageTk
        q = qrcode.make(f"http://{ips[0]}:{PORT}")
        photo = ImageTk.PhotoImage(getattr(q, "_img", q).convert("RGB").resize((190, 190)))
        lab = tk.Label(root, image=photo); lab.image = photo; lab.pack(pady=6)
        tk.Label(root, text="QR: abre a versão web (sem giroscópio)", fg="#666").pack()
    except Exception: pass
    info = tk.Label(root, text="", justify="left"); info.pack(pady=8, padx=16)
    usb = tk.Label(root, text="", fg="#666"); 
    def do_usb():
        try:
            o = subprocess.run(["adb", "reverse", f"tcp:{PORT}", f"tcp:{PORT}"], capture_output=True, text=True,
                               timeout=8, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            usb.config(text="USB pronto: no celular toque em \"Conectar por USB\"" if o.returncode == 0 else (o.stderr or o.stdout).strip()[:110])
        except FileNotFoundError: usb.config(text="adb não encontrado (instale o Android platform-tools)")
        except Exception as e: usb.config(text=str(e)[:110])
    tk.Button(root, text="Ativar conexão USB (adb reverse)", command=do_usb).pack()
    usb.pack(pady=(4, 14))
    def tick():
        if status["err"]: info.config(text=status["err"], fg="red")
        else:
            lines = [f"Controle {s + 1}: {players[s]}" for s in sorted(players)]
            info.config(text="\n".join(lines) or "Aguardando celular…", fg="black")
        root.after(500, tick)
    tick(); root.mainloop()

if __name__ == "__main__":
    try: vg.VX360Gamepad()
    except Exception: status["err"] = "Driver ViGEmBus não encontrado. Instale-o e reabra o PhonePad."
    threading.Thread(target=serve, daemon=True).start()
    gui()
