import forge from 'node-forge'
import fs from 'fs'
import mkdirp from 'mkdirp'
import path from 'path'
const isIp = (d: string = '') => /^\d+?\.\d+?\.\d+?\.\d+?$/.test(d)
const certCache: { [key: string]: { [key: string]: string } } = {} // 缓存证书
let defaultAttrs = [
  { name: 'countryName', value: 'CN' },
  { name: 'organizationName', value: 'AnyProxy' },
  { shortName: 'ST', value: 'SH' },
  { shortName: 'OU', value: 'AnyProxy SSL Proxy' }
]
const getRootCa = () => {
  mkdirp.sync(path.join(__dirname, './rootCA'))
  const certPath = path.join(__dirname, './rootCA/rootCA.crt')
  const keyPath = path.join(__dirname, './rootCA/rootCA.key')
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      privateKey: fs.readFileSync(keyPath).toString(),
      certificate: fs.readFileSync(certPath).toString()
    }
  } else {
    const keys = forge.pki.rsa.generateKeyPair(2048)
    const cert = forge.pki.createCertificate()
    const attrs = defaultAttrs.concat([
      { name: 'commonName', value: 'PDD ONLINE PROXY' }
    ])
    cert.publicKey = keys.publicKey
    cert.serialNumber = Math.floor(Math.random() * 100000) + ''
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setFullYear(
      cert.validity.notBefore.getFullYear() - 10
    ) // 10 years
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(
      cert.validity.notAfter.getFullYear() + 10
    ) // 10 years
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.setExtensions([{ name: 'basicConstraints', cA: true }])
    cert.sign(keys.privateKey, forge.md.sha256.create())
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey)
    const certificate = forge.pki.certificateToPem(cert)
    fs.writeFileSync(certPath, certificate)
    fs.writeFileSync(keyPath, privateKey)
    // const publicKey = forge.pki.publicKeyToPem(keys.publicKey)
    return { privateKey, certificate }
  }
}
// 读取 CA证书，后面需要根据它创建域名证书

const { privateKey, certificate } = getRootCa()
const caKey = forge.pki.privateKeyFromPem(privateKey)
const caCert = forge.pki.certificateFromPem(certificate)
/**
 * 根据所给域名生成对应证书
 */
export default function createServerCertificate(domain: string) {
  if (certCache[domain]) {
    return certCache[domain]
  }
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = Math.floor(Math.random() * 100000) + ''
  cert.validity.notBefore = new Date()
  cert.validity.notBefore.setFullYear(
    cert.validity.notBefore.getFullYear() - 10
  )
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10)

  cert.setIssuer(caCert.subject.attributes)
  cert.setSubject(
    defaultAttrs.concat([
      {
        name: 'commonName',
        value: domain
      }
    ])
  )
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      critical: true,
      digitalSignature: true,
      contentCommitment: true,
      keyEncipherment: true,
      dataEncipherment: true,
      keyAgreement: true,
      keyCertSign: true,
      cRLSign: true,
      encipherOnly: true,
      decipherOnly: true
    },
    {
      name: 'subjectKeyIdentifier'
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    },
    {
      name: 'authorityKeyIdentifier'
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: isIp(domain) ? 7 : 2,
          value: domain
        }
      ]
    }
  ])
  cert.sign(caKey, forge.md.sha256.create())
  certCache[domain] = {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
  }
  return certCache[domain]
}
