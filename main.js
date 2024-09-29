const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    const { search, location } = input;

    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

    // Dynamically build the URL based on search term and location
    const searchUrl = `https://www.goudengids.nl/nl/zoeken/${encodeURIComponent(search)}/${encodeURIComponent(location)}/`;

    await requestQueue.addRequest({
        url: searchUrl,
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

            $('.result-item__content').each((index, el) => {
                const element = $(el);

                // Scraping business name
                const name = element.find('.relative.pr-18').text().trim() || 'N/A';

                // Scraping address
                const address = element.find('li[itemprop="address"]').text().trim() || 'N/A';

                // Scraping phone number
                const phone = element.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value') || 'N/A';

                // Scraping website
                const website = element.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value') || 'N/A';

                const result = {
                    name,
                    address,
                    phone,
                    website,
                };

                results.push(result);
            });

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
