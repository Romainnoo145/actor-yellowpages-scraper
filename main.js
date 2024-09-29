const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    // Initialize
    const input = await Apify.getInput();
    const dataset = await Apify.openDataset();
    const requestQueue = await Apify.openRequestQueue();

    // Add URLs to requestQueue
    await requestQueue.addRequest({
        url: `https://www.goudengids.nl/nl/zoeken/Aannemer/Venlo/`,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.google.com',
        },
    });

    // Proxy Configuration
    const proxyConfiguration = await Apify.createProxyConfiguration({
        useApifyProxy: true,
    });

    // Create and run crawler
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageFunction: async ({ request, $ }) => {
            const { url } = request;

            // Random delay to avoid detection
            await Apify.utils.sleep(Math.random() * 3000 + 1000);

            // Process result list
            const results = [];
            const resultElems = $('.yp-Result');

            for (const r of resultElems.toArray()) {
                const jThis = $(r);
                const getText = (selector) => {
                    const text = jThis.find(selector).text().trim();
                    return text.length > 0 ? text : undefined;
                };
                const businessSlug = jThis.find('a').attr('href');
                const address = getText('.yp-Address')
                    || jThis
                        .find('.yp-Address')
                        .nextUntil('p')
                        .toArray()
                        .map((l) => $(l).text().trim())
                        .join(', ');
                const categories = jThis
                    .find('.yp-Categories a')
                    .toArray()
                    .map((c) => $(c).text().trim());
                const website = jThis
                    .find('a.yp-Website')
                    .attr('href');
                const phone = getText('.yp-Phone');
                const result = {
                    url: businessSlug ? `https://www.goudengids.nl${businessSlug}` : undefined,
                    name: getText('.yp-Name'),
                    address,
                    phone,
                    website,
                    categories: categories.length > 0 ? categories : undefined,
                };

                results.push(result);
            }

            // Store results and enqueue next page
            await dataset.pushData(results);

            const nextUrl = $('.pagination-next a').attr('href');

            if (nextUrl) {
                const nextPageReq = await requestQueue.addRequest({
                    url: `https://www.goudengids.nl${nextUrl}`,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': 'https://www.google.com',
                    },
                });

                if (!nextPageReq.wasAlreadyPresent) {
                    log.info('Found next page, adding to queue...', { url });
                }
            } else {
                log.info('No next page found', { url });
            }
        },
    });
    await crawler.run();
});
