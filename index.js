const axios = require('axios');
const gradient = require('gradient-string');
const fs = require('fs').promises;
const readline = require('readline');


const rainbowGradient = gradient(['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']);
const pastelGradient = gradient(['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA']);
const cristalGradient = gradient(['#40E0D0', '#FF8C00', '#FF0080']);
const yellowGradient = gradient(['yellow', 'orange']);
const fruitGradient = gradient(['#FF6B6B', '#4ECDC4']);
const mindGradient = gradient(['#3494E6', '#EC6EAD']);
const retroGradient = gradient(['#FF6B6B', '#556270']);
const viceGradient = gradient(['#5433FF', '#20BDFF', '#A5FECB']);
const atlasGradient = gradient(['#FEAC5E', '#C779D0', '#4BC0C8']);
const teenGradient = gradient(['#77A1D3', '#79CBCA', '#E684AE']);


function formatProgressMessage(progress, total, message) {
  const width = 30;
  const filledWidth = Math.round(width * progress / total);
  const emptyWidth = width - filledWidth;
  const filledBar = '█'.repeat(filledWidth);
  const emptyBar = '░'.repeat(emptyWidth);
  const percentage = Math.round((progress / total) * 100);
  return `${message} 進捗: ${filledBar}${emptyBar} ${percentage}% (${progress}/${total})`;
}


async function checkPromoCode(code) {
  try {
    const url = `https://discord.com/api/v8/entitlements/gift-codes/${code}`;
    const response = await axios.get(url);
    return { code, valid: true, data: response.data };
  } catch (error) {
    return { 
      code, 
      valid: false, 
      error: error.response?.data,
      status: error.response?.status
    };
  }
}


function extractCode(line) {
  const match = line.match(/[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}/);
  return match ? match[0] : null;
}


function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}


async function appendValidCode(code, isRedeemed) {
  const fullCode = `https://discord.com/billing/promotions/${code}`;
  const status = isRedeemed ? '(引き換え済み)' : '';
  await fs.appendFile('success.txt', `${fullCode} ${status}\n`);
}


function updateLastLine(text) {
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);
  process.stdout.write(text);
}


async function main() {
  try {
    console.log(rainbowGradient('Discord Promotion Checker'));

    const promoCodesContent = await fs.readFile('promos.txt', 'utf-8');
    const promoLines = promoCodesContent.split('\n').filter(line => line.trim() !== '');

    console.log(pastelGradient(`${promoLines.length}行のデータを読み込みました。`));

    let validCount = 0;
    let redeemedCount = 0;
    let totalChecked = 0;

    for (const line of promoLines) {
      const code = extractCode(line);
      if (!code) {
        console.log(fruitGradient(`無効な形式: ${line}`));
        totalChecked++;
        continue;
      }

      let result;
      let retryCount = 0;
      do {
        result = await checkPromoCode(code);
        if (result.valid) {
          validCount++;
          const isRedeemed = result.data.uses === result.data.max_uses;
          if (isRedeemed) {
            redeemedCount++;
            console.log(yellowGradient(`引き換え済みのコード: ${code}`));
          } else {
            console.log(cristalGradient(`有効なコード: ${code}`));
          }
          await appendValidCode(code, isRedeemed);
        } else {
          if (result.status === 403) {
            retryCount++;
            console.log(mindGradient(`403エラー (${retryCount}回目). コード: ${code}`));
            await wait(30);
          } else if (result.status === 429) {
            const retryAfter = result.error?.retry_after || 60;
            console.log(mindGradient(`エラー429`));
            await wait(retryAfter);
          } else {
            console.log(viceGradient(`無効なコード: ${code}`));
          }
        }
      } while ((result.status === 403 && retryCount < 3) || result.status === 429);

      totalChecked++;
      

      const progressMessage = formatProgressMessage(totalChecked, promoLines.length, '進捗状況');
      updateLastLine(atlasGradient(progressMessage));

      await wait(1);
    }

    console.log('\n' + rainbowGradient(`チェックが完了しました。`));
    console.log(pastelGradient(`有効なコード: ${validCount}個 (うち引き換え済み: ${redeemedCount}個)`));
    console.log(pastelGradient(`結果はsuccess.txtに保存されました。`));

  } catch (error) {
    console.error(teenGradient('エラーが発生しました:'));
    console.error(error);
    console.error(teenGradient('スタックトレース:'), error.stack);
  }
}


main().catch(error => {
  console.error(teenGradient('未キャッチのエラーが発生しました:'));
  console.error(error);
  console.error(teenGradient('スタックトレース:'), error.stack);
});
