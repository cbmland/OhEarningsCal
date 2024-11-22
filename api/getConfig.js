// downloadData.js
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从 URL 提取文件名
const extractFilename = (url) => {
    try {
        // 移除查询参数
        const urlWithoutQuery = url.split('?')[0];
        // 获取路径的最后一部分
        const fullFilename = urlWithoutQuery.split('/').pop();
        
        // 如果没有获取到文件名，使用时间戳
        if (!fullFilename) {
            return `data_${Date.now()}.json`;
        }
        
        // 确保文件扩展名为 .json
        const filename = fullFilename.toLowerCase().endsWith('.json') 
            ? fullFilename 
            : `${fullFilename}.json`;
            
        // 替换非法字符
        return filename.replace(/[<>:"/\\|?*]/g, '_');
    } catch (error) {
        console.warn('Error extracting filename, using timestamp:', error);
        return `data_${Date.now()}.json`;
    }
};

// 确保目录存在
const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
};

// 下载JSON数据
const downloadJson = (url) => {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (res) => {
            let data = '';

            // 处理重定向
            if (res.statusCode === 301 || res.statusCode === 302) {
                console.log(`Redirecting to: ${res.headers.location}`);
                downloadJson(res.headers.location)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // 检查状态码
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP Status Code: ${res.statusCode}`));
                return;
            }

            // 接收数据
            res.on('data', (chunk) => {
                data += chunk;
            });

            // 数据接收完成
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Failed to parse JSON: ' + error.message));
                }
            });
        });

        // 设置超时
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });

        request.on('error', (error) => {
            reject(new Error('Download failed: ' + error.message));
        });
    });
};

// 主函数
async function downloadData(url,fileName) {
    if (!url) {
        throw new Error('URL is required');
    }

    const saveDir = path.join(__dirname, 'datas');
    
    if (!fileName)
    {
        fileName = extractFilename(url);
    }
    
    const filePath = path.join(saveDir, fileName);

    try {
        // 确保目录存在
        await ensureDirectoryExists(saveDir);

        console.log(`Downloading JSON from: ${url}`);
        console.log(`Will save as: ${fileName}`);
        
        const jsonData = await downloadJson(url);

        // 保存文件
        await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`Successfully saved to: ${filePath}`);
        
        return {
            data: jsonData,
            filePath,
            fileName
        };
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

export { downloadData };