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
            const resultElems = $('.profile-actions'); // Adjusted for business container

            for (const r of resultElems.toArray()) {
                const jThis = $(r);
                
                // Business Name
                const businessName = jThis.find('.business-name-selector').text().trim(); // Adjust this selector to match the actual class
                
                // Website
                const website = jThis.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value');
                
                // Phone
                const phone = jThis.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value');
                
                // E-mail
                const email = jThis.find('.profile-actions__item[data-js-event="email"]').attr('data-js-value');
                
                // Address
                const address = jThis.find('.address-selector').text().trim(); // Adjust selector for address
                
                // Categories
                const categories = jThis.find('.category-selector').text().trim(); // Adjust selector for categories

                const result = {
                    businessName: businessName || undefined,
                    website: website || undefined,
                    phone: phone || undefined,
                    email: email || undefined,
                    address: address || undefined,
                    categories: categories || undefined,
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
