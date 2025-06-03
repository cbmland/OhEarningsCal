import { createEvents } from 'ics';
import { writeFileSync } from 'fs';
import { processData } from './processdata.js';
import {ensureDirectoryExists} from './getConfig.js'

function simplifyNumber(marketValueStr) {
    let number = parseFloat(marketValueStr.replace(/[$,]/g, "")); // 将字符串转换为数字并去除 $ 和逗号
    
    const suffixes = ["", "K", "M", "B", "T"]; // 数字后缀，例如 K 代表千，M 代表百万，B 代表十亿，T 代表万亿
    const suffixNum = Math.floor(("" + number).length / 3); // 计算数字的数量级

    let shortNumber = parseFloat((suffixNum !== 0 ? (number / Math.pow(1000, suffixNum)) : number).toPrecision(3));
    if (shortNumber % 1 !== 0) {
        shortNumber = shortNumber.toFixed(2);
    }

    return shortNumber + suffixes[suffixNum];
}

async function generateEarningsICSCalendar(date,list,filename) {
    try {
        
        console.log('Generating earnings calendar for', date);
        const earningsData = await processData(date,list); // 获取财报数据


        const events = earningsData.map(entry => {
            const dateParts = entry.date.split('-').map(Number);
            let start;
            if (entry.time === '盘后') {
                start = [dateParts[0], dateParts[1], dateParts[2], 20, 0];
            } else {
                start = [dateParts[0], dateParts[1], dateParts[2], 12, 0];
            }
            return {
                title: `${entry.time} ${entry.symbol}(${entry.companyName})发布财报`,
                description: `财务季度：${entry.fiscalQuarterEnding} \n公司：${entry.companyName} \n预计每股收益: ${entry.epsForecast}，当前市值: ${simplifyNumber(entry.marketCap)}。\n\n在股票App查看： stocks://?symbol=${entry.symbol} \n在富途查看：https://www.futunn.com/hk/stock/${entry.symbol}-US \n在老虎查看：https://www.laohu8.com/stock/${entry.symbol} \nTradingView：https://www.tradingview.com/symbols/${entry.symbol}/`,
                start: start,
                duration: { hours: 1, minutes: 0 }, // 持续时间
                startInputType: 'utc', // 时区会有误差，但可以接受
                status: 'CONFIRMED',
                busyStatus: 'FREE',
                alarms: [
                    { action: 'display', description: 'Reminder', trigger: { hours: 
                        entry.time === '盘后' ? 8:2, minutes: 0, before: true } }
                ]
            };
        });

        const headerAttributes = {
            productId: `${filename} Earnings Calendar`,
            calName: 'Earnings Calendar 财报日历',
            method: 'PUBLISH',
        };

        createEvents(events,headerAttributes, async (error, value) => {
            if (error) {
                console.error(error);
                return;
            }
            await ensureDirectoryExists('./docs/ics/');
            writeFileSync(`./docs/ics/${filename}.ics`, value);
            console.log(`Earnings calendar .ics file has been saved to ./docs/ics/${filename}.ics.`);
        });
    } catch (error) {
        console.error('Error generating earnings ICS calendar:', error);
    }
}

export { generateEarningsICSCalendar };
