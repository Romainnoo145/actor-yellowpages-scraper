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

            // Business Name
            const businessName = $('div.profile__info h1').text().trim();
            
            // Address
            const address = $('div.profile__info span').text().trim(); 
            
            // Category (adjust selector if necessary)
            const category = $('div.profile__info span.category-selector').text().trim(); 
            
            // Website
            const website = $('div.profile-actions__item[data-js-event="link"]').attr('data-js-value');
            
            // Phone
            const phone = $('div.profile-actions__item[data-js-event="call"]').attr('data-js-value');

            const result = {
                businessName: businessName || undefined,
                address: address || undefined,
                category: category || undefined,
                website: website || undefined,
                phone: phone || undefined,
            };

            results.push(result);

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
