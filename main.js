const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

    // Add the main URL to the request queue
    await requestQueue.addRequest({
        url: 'https://www.goudengids.nl/nl/zoeken/Aannemer/Venlo/',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.google.com',
        },
    });

    const proxyConfiguration = await Apify.createProxyConfiguration({
        useApifyProxy: true,
    });

    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageFunction: async ({ request, $ }) => {
            const results = [];
            const resultElems = $('.result-item__content'); // Refined selector for the block

            for (const r of resultElems.toArray()) {
                const jThis = $(r);
                
                // Extract business name, cleaning out any unwanted text
                const businessName = jThis.find('.result-item__title').text().trim().replace(/Ben je eigenaar van deze zaak\?/, '').trim();

                // Extract the address (if present)
                const address = jThis.find('.result-item__info').find('div:nth-child(2)').text().trim() || 'N/A';

                // Extract the phone
                const phone = jThis.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value') || 'N/A';
                
                // Extract the website link
                const website = jThis.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value') || 'N/A';
                
                const result = {
                    name: businessName || 'N/A',
                    address: address || 'N/A',
                    phone: phone || 'N/A',
                    website: website || 'N/A',
                };

                results.push(result);
            }

            // Store results in the dataset
            await dataset.pushData(results);

            log.info(`Scraped ${results.length} results from ${request.url}`);

            const nextUrl = $('.pagination-next a').attr('href');
            if (nextUrl) {
                await requestQueue.addRequest({
                    url: `https://www.goudengids.nl${nextUrl}`,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': 'https://www.google.com',
                    },
                });
            } else {
                log.info('No next page found');
            }
        },
    });

    await crawler.run();
});
