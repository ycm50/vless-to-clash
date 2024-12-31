import tkinter as tk
from tkinter import filedialog
import uuid
import re
import yaml

def generate_clash_config(vless_urls):
    proxies = []
    
    for index, url in enumerate(vless_urls.split('\n')):
        url = url.strip()
        if not url:
            continue  # 跳过空行
        
        # 更新后的正则表达式，支持IPv6地址
        regex = r"vless:\/\/([^@]+)@(\[[^\]]+\]):(\d+)\?([^\#]+)#(.+)"
        matches = re.match(regex, url)
        
        if not matches:
            print(f"URL格式不匹配: {url}")
            continue  # 如果不符合格式则跳过
        
        uuid_value = matches[1]
        server = matches[2]  # IPv6地址应当包含方括号
        port = matches[3]
        query = matches[4]
        sni = None
        path = None
        host = None
        
        # 解析 query 参数
        for param in query.split('&'):
            key, value = param.split('=')
            if key == 'sni':
                sni = value
            elif key == 'path':
                path = value
            elif key == 'host':
                host = value
        
        server = server.replace('[', '"').replace(']', '"')
        print(f"解析成功: Proxy{index + 1}, {{ uuid: {uuid_value}, server: {server}, port: {port}, sni: {sni}, path: {path}, host: {host} }}")

        proxies.append({
            'name': f'Proxy{index + 1}',
            'type': 'vless',
            'server': server,
            'port': int(port),  # 确保port是数字
            'uuid': uuid_value,
            'encryption': 'none',
            'tls': True,
            'sni': sni,
            'network': 'ws',
            'ws-opts': {
                'path': path,
                'headers': {
                    'host': host
                }
            },
            'skip-cert-verify': True
        })
    
    return {
        'proxies': proxies,
        'proxy-groups': [],
        'rules': []
    }

def to_yaml(obj):
    return yaml.dump(obj, allow_unicode=True, default_flow_style=False, sort_keys=False)

def save_file(content):
    filepath = filedialog.asksaveasfilename(defaultextension=".yaml", filetypes=[("YAML files", "*.yaml")])
    if filepath:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"配置文件已保存到 {filepath}")

def on_convert_click():
    vless_urls = vless_text.get("1.0", tk.END).strip()
    if not vless_urls:
        print("请输入 VLESS URL")
        return
    
    clash_config = generate_clash_config(vless_urls)
    yaml_content = to_yaml(clash_config)
    save_file(yaml_content)

# 创建GUI
root = tk.Tk()
root.title("VLESS to Clash Converter")

# 创建文本框和按钮
vless_text = tk.Text(root, height=15, width=80)
vless_text.pack(pady=20)

convert_button = tk.Button(root, text="Convert", command=on_convert_click)
convert_button.pack(pady=10)

# 运行GUI
root.mainloop()