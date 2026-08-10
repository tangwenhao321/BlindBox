/* eslint-env node */
import http from 'http'
import fs from 'fs'
import fse from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
const sourceUrl = 'http://localhost:9912/ts.zip'
const tmpFilePath = os.tmpdir() + '/' + uuidv4() + '.zip'
const generatePath = 'src/apis/__generated'

console.log('Downloading ' + sourceUrl + '...')

const tmpFile = fs.createWriteStream(tmpFilePath)
http.get(sourceUrl, (response) => {
  response.pipe(tmpFile)
  tmpFile.on('finish', () => {
    tmpFile.close()
    console.log('File save success: ', tmpFilePath)

    // Remove generatePath if it exists
    if (fs.existsSync(generatePath)) {
      console.log('Removing existing generatePath...')
      fse.removeSync(generatePath)
      console.log('Existing generatePath removed.')
    }

    // Unzip the file using adm-zip
    console.log('Unzipping the file...')
    const zip = new AdmZip(tmpFilePath)
    zip.extractAllTo(generatePath, true)
    console.log('File unzipped successfully.')
    // Remove the temporary file
    console.log('Removing temporary file...')
    fs.unlink(tmpFilePath, (err) => {
      if (err) {
        console.error('Error while removing temporary file:', err)
      } else {
        console.log('Temporary file removed.')
      }
    })
    traverseDirectory(modelPath)
    traverseDirectory(servicePath)
    getDictConstants()
  })
})

// 替换目录路径
const modelPath = 'src/apis/__generated/model'
const servicePath = 'src/apis/__generated/services'

// 递归遍历目录中的所有文件
function traverseDirectory(directoryPath) {
  const files = fs.readdirSync(directoryPath)

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file)
    const stats = fs.statSync(filePath)

    if (stats.isDirectory()) {
      traverseDirectory(filePath)
    } else if (stats.isFile() && path.extname(filePath) === '.ts') {
      replaceInFile(filePath)
    }
  })
}

// 替换文件中的文本
function replaceInFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const updatedContent = fileContent
    .replaceAll('readonly ', '')
    .replace(/ReadonlyArray/g, 'Array')
    .replaceAll('ReadonlyMap', 'Map')
    .replace(/Map<(\S+), (\S+)>/g, '{ [key: $1]: $2 }')
  // .replace(/query: (\S+)/g, 'query: T')
  fs.writeFileSync(filePath, updatedContent, 'utf8')
}

const getDictConstants = () => {
  const outputPath = 'src/apis/__generated/model/enums/DictConstants.ts'
  const fallbackDictConstants = `export const DictConstants = {
  GENDER: 1001,
  MENU_TYPE: 1002,
  PRODUCT_ORDER_STATUS: 1003,
  PAY_TYPE: 1004,
  USER_STATUS: 1005,
  COUPON_TYPE: 1006,
  COUPON_SCOPE_TYPE: 1007,
  COUPON_USE_STATUS: 1008,
  COUPON_RECEIVE_TYPE: 1009,
  REFUND_STATUS: 1010,
  ORDER_TYPE: 1012,
  NAVIGATOR_TYPE: 1013,
  QUALITY_TYPE: 1014
} as const
`
  http.get('http://localhost:9912/dict/ts', (response) => {
    let content = ''
    response.on('data', (chunk) => {
      content += chunk.toString()
    })
    response.on('end', () => {
      // If backend returns JSON error object instead of ts source,
      // write a fallback constant file to keep the admin build available.
      if (content.trim().startsWith('{')) {
        fs.writeFileSync(outputPath, fallbackDictConstants, 'utf8')
      } else {
        fs.writeFileSync(outputPath, content, 'utf8')
      }
    })
  })
}
