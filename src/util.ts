import * as url from 'url'

import zlib from 'zlib'

export const getHeaders = (data: Buffer) => {
  return data
    .toString()
    .split('\r\n')
    .reduce((result, item) => {
      if (!item) return result
      const index = item.indexOf(':')
      result[item.slice(0, index).toLowerCase()] = item.slice(index + 1)
      return result
    }, {} as any)
}
export const getPathAndPort = (host: string) => ({
  hostname: host.split(':')[0].trim(),
  port: +host.split(':')[1] || 80,
})
export const getHostPort = (data: Buffer) =>
  getPathAndPort(getHeaders(data)['host'])

export const getReqInfo = (req: any, isHttps: boolean = true, isWs = false) => {
  let urlPattern
  const protocol = isWs ?
    (isHttps ? "wss" : "ws") :
    (isHttps ? 'https' : 'http')
  try {
    urlPattern = url.parse(req.url)
  } catch (e) {
    console.error(e)
  }
  const fullUrl = protocol + '://' + req.headers.host + (urlPattern?.path || "")
  urlPattern = url.parse(fullUrl)
  return {
    hostname: urlPattern.hostname,
    port: urlPattern.port || req.port || (isHttps ? 443 : 80),
    method: req.method,
    headers: req.headers,
    path: urlPattern.path,
    url: fullUrl,
  }
}
export const getResInfo = (res: any) => {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: res.headers,
    httpVersion: res.httpVersion
  }
}

export const createHttpHeader = function (line: string, headers: any) {
  return (
    Object.keys(headers)
      .reduce(
        function (head, key) {
          var value = headers[key];

          if (!Array.isArray(value)) {
            head.push(key + ': ' + value);
            return head;
          }

          for (var i = 0; i < value.length; i++) {
            head.push(key + ': ' + value[i]);
          }
          return head;
        },
        [line]
      )
      .join('\r\n') + '\r\n\r\n'
  );
};


export const printInfo = (data: Buffer, res: any) => {
  switch (
  res.headers['content-encoding'] ||
  res.headers['Content-Encoding']
  ) {
    case 'gzip':
      zlib.gunzip(data, (err: any, d: any) => {
        console.log(d && d.toString())
      })
      break
    case 'deflate':
      zlib.inflate(data, (err: any, d: any) => {
        console.log(d && d.toString())

      })
      break
    case 'br':
      zlib.brotliDecompress(data, (err: any, d: any) => {
        console.log(d && d.toString())
      })
      break
    default:
      console.log(data.toString())
  }
}