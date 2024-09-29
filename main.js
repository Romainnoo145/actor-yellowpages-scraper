const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

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

            // Iterate over each business listing on the page
            const resultElems = $('.profile-actions'); // Update this selector based on your webpage structure

            for (const r of resultElems.toArray()) {
                const jThis = $(r);

                // Extract business name
                const businessName = jThis.find('.profile-actions__item').text().trim();

                // Extract website
                const website = jThis.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value');
                
                // Extract phone number
                const phone = jThis.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value');
                
                // Extract address
                const address = jThis.find('.flex.flex-wrap.lg\\:flex-nowrap .profile__info').text().trim();

                const result = {
                    businessName: businessName || undefined,
                    phone: phone || undefined,
                    website: website || undefined,
                    address: address || undefined,
                };

                results.push(result);
            }

            // Store results in dataset
            await dataset.pushData(results);

            log.info(`Scraped ${results.length} results.`);
        },
    });

    await crawler.run();
});
