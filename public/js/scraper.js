import fetch from 'node-fetch';  //for scraping data
import * as cheerio from 'cheerio';  //for parsing scrapped data

async function scrapeData(url) {
    try {
        const response = await fetch(url);
        // Extract text from the HTML content
        const htmlContent = await response.text();
        // Load HTML content into Cheerio
        const $ = cheerio.load(htmlContent);

        // Extract text from an element with CSS Selector
        const modelName = $('.specs-phone-name-title').text();

        // Extract element: first find <tr> elements that contains <a> elements that includes the word 'Status'.
        // Then finds <td> elements inside previous <tr> element.
        const releaseDate = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Status')})
            .find('td:nth-child(2)').text().slice(20);

        const phoneDimensions = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Dimensions')})
            .find('td:last').text().replace(/mm.*/, 'mm');

        const phoneWeight = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Weight')})
            .find('td:last').text().replace(/g.*/, 'g');

        const screenSize = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Size')})
            .find('td:last').text().replace(/,.*/, '');

        //Here we filter <th> elements that contain word 'Platform'
        const phoneOs = $('tr').filter(function(i, el){return $(el).find('th').text().includes('Platform')})
            .find('td:last').text();

        const chipset = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Chipset')})
            .find('td:last').text();

        const internalMemory = $('tr').filter(function(i, el){return $(el).find('a').text().includes('Internal')})
            .find('td:last').text();

        const mainCamera = $('tr').filter(function(i, el){return $(el).find('th').text().includes('Main Camera')})
            .find('td:last').text().replace(/\n/g, '<br>');

        const selfieCamera = $('tr').filter(function(i, el){return $(el).find('th').text().includes('Selfie camera')})
            .find('td:last').text().replace(/,.*/, '');

        const battery = $('tr').filter(function(i, el){return $(el).find('th').text().includes('Battery')})
            .find('td:last').text().replace(/mAh.*/, 'mAh');

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
