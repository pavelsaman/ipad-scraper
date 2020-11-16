const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const config = require('./config.json');
const pagesToScrape = require('./pagesToScrape.json');

const dbFile = './prices.db';
const date = new Date();

const getRidOfSpecialChars = (arr) => {
    let newArr = arr.map(p => p.replace(/ /g, ''));
    newArr = newArr.map(p => p.replace(/,/g, ''));
    newArr = newArr.map(p => p.replace(/-/g, ''));
    newArr = newArr.map(p => p.replace(/\&nbsp;/g, ''));
    newArr = newArr.map(p => p.replace(/Kč/g, ''));

    return newArr;
};

const savePrices = async (priceObj) => {
    const db = await sqlite.open({
        filename: dbFile,
        driver: sqlite3.Database
    });
    
    for (let p of priceObj.prices) {
        await db.run(
            'INSERT INTO Prices (name, company, url, price, datetime) VALUES (?, ?, ?, ?, ?)',
            priceObj.metaInfo.name,
            priceObj.metaInfo.company,
            priceObj.metaInfo.url,
            p,
            date.toISOString()
        );
    }

    await db.close();
}

(async () => {

    const browser = await puppeteer.launch(config.browserConfig);
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    for (let p of pagesToScrape) {

        await Promise.all([
            page.goto(p.url, { waitUntil: 'networkidle0' }),
            page.waitForSelector(p.priceEl)
        ]);        

        let prices = await page.$$eval(p.priceEl, s => s.map(t => t.innerHTML));
        prices = getRidOfSpecialChars(prices);
        await savePrices({ metaInfo: p, prices: prices });
    }
    
    await context.close();
    await browser.close();
})();