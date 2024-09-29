const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

    // Start with the main URL for the search
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
            const resultElems = $('.result-item__content'); // Adjusted to target result block

            for (const r of resultElems.toArray()) {
                const jThis = $(r);

                // Business Name
                const businessName = jThis.find('.relative.pr-18').text().trim();

                // Category
                const category = jThis.find('.mb-2.5.flex.items-start.gap-4').text().trim();

                // Address
                const address = jThis.find('li[itemprop="address"]').text().trim();

                // Website
                const website = jThis.find('a[data-js-event="link"]').attr('data-js-value');

                // Phone
                const phone = jThis.find('a[data-js-event="call"]').attr('data-js-value');

                const result = {
                    name: businessName || 'N/A',
                    address: address || 'N/A',
                    phone: phone || 'N/A',
                    website: website || 'N/A',
                    category: category || 'N/A'
                };

                results.push(result);
            }

            // Store results
            await dataset.pushData(results);

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

