// 解析VLESS链接并生成Clash配置
const generateClashConfig = (vlessUrls) => {
  const proxies = vlessUrls.split('\n').map((url, index) => {
    if (!url.trim()) return null; // 跳过空行

    // 更新后的正则表达式，支持IPv6地址
    const regex = /vless:\/\/([^@]+)@(\[[^\]]+\]):(\d+)\?([^\#]+)#(.+)/;
    const matches = url.match(regex);

    if (!matches) {
      console.log(`URL格式不匹配: ${url}`); // 输出不匹配的URL，便于调试
      return null; // 如果不符合格式则跳过
    }

    const uuid = matches[1];
    let server = matches[2]; // IPv6地址应当包含方括号
    const port = matches[3];
    const query = new URLSearchParams(matches[4]);
    const sni = query.get('sni');
    const path = query.get('path');
    const host = query.get('host');
    server = server.replace(/\[/g, '"').replace(/\]/g, '"');
    console.log(`解析成功: Proxy${index + 1}, { uuid, server, port, sni, path, host }`); // 调试输出

    return {
      name: `Proxy${index + 1}`,
      type: 'vless',
      server: server,
      port: parseInt(port), // 确保port是数字
      uuid: uuid,
      encryption: 'none',
      tls: true,
      sni: sni,
      network: 'ws',
      'ws-opts': {
        path: path,
        headers: {
          host: host
        }
      },
      'skip-cert-verify': true
    };
  }).filter(item => item !== null); // 过滤掉无效的项

  console.log('生成的proxies:', proxies); // 调试输出生成的 proxies

  return {
    proxies: proxies,
    'proxy-groups': [],
    rules: []
  };
};

// Cloudflare Worker 处理请求
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST') {
    // 读取表单数据
    const formData = await request.formData();
    const vlessUrls = formData.get('vlessUrls');
    const filename = formData.get('filename') || 'clash_config.yaml';  // 如果没有提供文件名，使用默认值

    // 生成 Clash 配置
    const clashConfig = generateClashConfig(vlessUrls);

    // 设置响应头，指定下载文件名
    const headers = {
      'Content-Type': 'application/yaml',
      'Content-Disposition': `attachment; filename="${filename}"` // 使用用户提供的文件名
    };

    // 返回生成的 Clash 配置
    return new Response(toYaml(clashConfig), { headers });
  } else {
    return new Response('Please use POST method', { status: 405 });
  }
}

// 简单的 JSON 转 YAML 函数
function toYaml(obj) {
  let yaml = '';

  const recursive = (obj, indent = '') => {
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${indent}-`; // '- '之前不加空格
        recursive(item, indent + '  '); // 子元素增加缩进
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          yaml += `${indent}${(key === 'name' || key === '-name' || key === '-') ? key : ' ' + key}:`;

          if (typeof obj[key] === 'object') {
            yaml += '\n'; // 对于对象类型，换行
            recursive(obj[key], indent + '  '); // 递归处理子对象
          } else {
            yaml += ` ${obj[key]}\n`; // 对于基础类型，直接输出并换行
          }
        }
      }
    } else {
      yaml += `${indent}${obj}\n`; // 基本类型输出
    }
  };

  recursive(obj);

  // 批量替换多个字段
  const replacements = [
    [/ -    name/g, ' - name'],
    [/ type/g, 'type'],
    [/ server/g, 'server'],
    [/ uuid/g, 'uuid'],
    [/ encryption/g, 'encryption'],
    [/ tls/g, 'tls'],
    [/ sni/g, 'sni'],
    [/ network/g, 'network'],
    [/ ws-opts/g, 'ws-opts'],
    [/ path/g, 'path'],
    [/ headers/g, 'headers'],
    [/ host/g, 'host'],
    [/ port/g, 'port'],
    [/ skip-cert-verify/g, 'skip-cert-verify']
  ];

  // 执行所有替换操作
  replacements.forEach(([regex, replacement]) => {
    yaml = yaml.replace(regex, replacement);
  });

  return yaml;
}
