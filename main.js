const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    
    // Add the starting URL
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
        handlePageFunction: async ({ $, request }) => {
            const results = [];

            // Targeting each business listing
            $('.result-item__content').each((index, el) => {
                const name = $(el).find('.result-item__info a').text().trim();
                const address = $(el).find('.result-item__info p').text().trim();
                const phone = $(el).find('.profile-actions__item[data-js-event="call"]').attr('data-js-value');
                const website = $(el).find('.profile-actions__item[data-js-event="link"]').attr('data-js-value');

                if (name || address || phone || website) {
                    results.push({
                        name: name || 'N/A',
                        address: address || 'N/A',
                        phone: phone || 'N/A',
                        website: website || 'N/A',
                    });
                }
            });

            // Log and push results to dataset
            if (results.length > 0) {
                log.info(`Scraped ${results.length} businesses.`);
                await Apify.pushData(results);
            } else {
                log.warn('No businesses found on this page.');
            }
        },
    });

    await crawler.run();
});

