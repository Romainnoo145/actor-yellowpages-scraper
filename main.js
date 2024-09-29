const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

    // Add the main URL to the requestQueue
    await requestQueue.addRequest({
        url: `https://www.goudengids.nl/nl/zoeken/Aannemer/Venlo/`,
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
            const resultElems = $('.result-item__content'); // Adjusted to capture the listing container

            for (const r of resultElems.toArray()) {
                const jThis = $(r);
                
                // Extract business name
                const businessName = jThis.find('.result-item__name').text().trim();
                
                // Extract address
                const address = jThis.find('.result-item__address').text().trim();
                
                // Extract phone
                const phone = jThis.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value');
                
                // Extract website
                const website = jThis.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value');

                const result = {
                    name: businessName || undefined,
                    address: address || undefined,
                    phone: phone || undefined,
                    website: website || undefined,
                };

                results.push(result);
            }

            // Store results
            await dataset.pushData(results);

            log.info(`Scraped ${results.length} results.`);
        },
    });
    await crawler.run();
});
