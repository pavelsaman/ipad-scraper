const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const config = require('./config.json');
const pagesToScrape = require('./pagesToScrape.json');
const dbFile = config.dbFile;
const date = new Date();

const getRidOfSpecialChars = (arr) => {
    let newArr = arr.map(p => p.replace(/ /g, ''));
    newArr = newArr.map(p => p.replace(/,/g, ''));
    newArr = newArr.map(p => p.replace(/-/g, ''));
    newArr = newArr.map(p => p.replace(/\&nbsp;/g, ''));
    newArr = newArr.map(p => p.replace(/Kč/g, ''));

    return newArr;
};

const openDB = () => {
    return sqlite.open({
        filename: dbFile,
        driver: sqlite3.Database
    });
};

const savePrices = async (priceObj, db) => {
    for (const p of priceObj.prices) {
        await db.run(
            'INSERT INTO Prices (name, company, url, price, datetime) VALUES (?, ?, ?, ?, ?)',
            priceObj.metaInfo.name,
            priceObj.metaInfo.company,
            priceObj.metaInfo.url,
            p,
            date.toISOString()
        );
    }
}

(async () => {
    const browser = await puppeteer.launch(config.browserConfig);
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    const db = await openDB();

    for (const p of pagesToScrape) {

        await Promise.all([
            page.goto(p.url, { waitUntil: 'networkidle0' }),
            page.waitForSelector(p.priceEl)
        ]);        

        const prices
            = await page.$$eval(p.priceEl, s => s.map(t => t.innerHTML));
        await savePrices(
            { 
                metaInfo: p, 
                prices: getRidOfSpecialChars(prices)
            }, 
            db
        );
    }
    
    await db.close();
    await context.close();
    await browser.close();
})();
