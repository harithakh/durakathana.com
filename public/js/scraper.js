import fetch from 'node-fetch';  //for scraping data
import * as cheerio from 'cheerio';  //for parsing scrapped data

async function scrapeData(url) {
    try {
        const response = await fetch(url);
        // Extract text from the HTML content
        const htmlContent = await response.text();
        // Load HTML content into Cheerio
        const $ = cheerio.load(htmlContent);

        // Example: Extract text from an element with CSS Selector
        const modelName = $('.specs-phone-name-title').text();

        const releaseDate = $('#specs-list > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)')
            .text().slice(20);

        const phoneDimensions = $('#specs-list > table:nth-child(4) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)')
            .text().replace(/mm.*/, 'mm');

        const phoneWeight = $('#specs-list > table:nth-child(4) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)')
            .text().replace(/g.*/, 'g');

        const screenSize = $('#specs-list > table:nth-child(5) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)')
            .text().replace(/,.*/, '');

        const phoneOs = $('#specs-list > table:nth-child(6) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)')
            .text();

        const chipset = $('#specs-list > table:nth-child(6) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)')
            .text();

        const internalMemory = $('#specs-list > table:nth-child(7) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)')
            .text();

        const mainCamera = $('#specs-list > table:nth-child(8) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)')
            .text().replace(/\n/g, '<br>');

        const selfieCamera = $('#specs-list > table:nth-child(9) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)')
            .text().replace(/,.*/, '');

        const battery = $('#specs-list > table:nth-child(13) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)')
        .text().replace(/mAh.*/, 'mAh');

        const phoneInfo = {
            model: modelName,
            releaseDate: releaseDate,
            dimensions: phoneDimensions,
            weight: phoneWeight,
            screenSize: screenSize,
            os: phoneOs,
            chipset: chipset,
            internalMemory: internalMemory,
            mainCamera: mainCamera,
            selfieCamera: selfieCamera,
            battery: battery
        };
        return phoneInfo;

    } catch (error) {
        // throw new Error(`Scraping failed: ${error.message}`);
        console.log(error)
    }
}


//when we import this module in index.js, we can use any name we want to refer to the exported value here, 
export default scrapeData;
