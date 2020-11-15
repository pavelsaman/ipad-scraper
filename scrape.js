const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const dbFile = './prices.db';
const date = new Date();
const browserConfig = {
    headless: {
        headless: true,
        args: [                
            '--window-size=1920,1040'
        ],
        defaultViewport: null
    },
    gui: {
        headless: false,
        args: [                
            '--start-maximized'     
        ],
        defaultViewport: null            
    },
    debug: {
        headless: false,
        args: [                
            '--start-maximized'
        ],
        defaultViewport: null,
        slowMo: 50,
        devtools: true          
    }
};

const pagesToScrape = [
    {
        company: 'Alza',
        name: 'iPad 2020',
        url: 'https://www.alza.cz/ipad-2020/18881698.htm',
        priceEl: 'div.priceInner > span.c2'
    },
    {
        company: 'Alza',
        name: 'iPad Pro 12.9"',
        url: 'https://www.alza.cz/ipad-pro-12-9/18858953.htm',
        priceEl: 'div.priceInner > span.c2'
    },
    {
        company: 'Alza',
        name: 'iPad Pro 11"',
        url: 'https://www.alza.cz/ipad-pro-11/18867629.htm',
        priceEl: 'div.priceInner > span.c2'
    },
    {
        company: 'Datart',
        name: 'iPad Pro',
        url: 'https://www.datart.cz/ipad-pro.html?perPage=48',
        priceEl: '#products-list >* span.actual > span.tooltip.tooltipstered'
    },
    {
        company: 'CZC',
        name: 'iPad Pro 12.9" 2020',
        url: 'https://www.czc.cz/ipad-pro-12-9-2020-s-ipados/produkty',
        priceEl: '.price-vatin'
    }
];

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
    
    const isoDate = date.toISOString();
    for (let p of priceObj.prices) {
        await db.run(
            'INSERT INTO Prices (name, company, url, price, datetime) VALUES (?, ?, ?, ?, ?)',
            priceObj.metaInfo.name,
            priceObj.metaInfo.company,
            priceObj.metaInfo.url,
            p,
            isoDate
        );
    }

    await db.close();
}

(async () => {

    const browser = await puppeteer.launch(browserConfig.headless);
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