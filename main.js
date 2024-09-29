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
            log.info(`Processing page: ${request.url}`);
            const results = [];
            
            // Refining selectors for business elements
            const resultElems = $('.profile__main'); // Based on your previous image
            
            if (resultElems.length === 0) {
                log.warning('No results found on this page.');
            }

            for (const r of resultElems.toArray()) {
                const jThis = $(r);

                // Business Name
                const businessName = jThis.find('h1').text().trim();
                
                // Address
                const address = $('span:contains("straat")').text().trim(); // Adjust if needed

                // Category
                const category = $('span.category-selector').text().trim(); // Adjust if needed

                // Website
                const website = jThis.find('.profile-actions__item[data-js-event="link"]').attr('data-js-value');
                
                // Phone
                const phone = jThis.find('.profile-actions__item[data-js-event="call"]').attr('data-js-value');
                
                // E-mail
                const email = jThis.find('.profile-actions__item[data-js-event="email"]').attr('data-js-value');

                const result = {
                    businessName: businessName || 'No name found',
                    address: address || 'No address found',
                    category: category || 'No category found',
                    website: website || 'No website found',
                    phone: phone || 'No phone found',
                    email: email || 'No email found',
                };

                log.info(`Scraped result: ${JSON.stringify(result)}`);
                results.push(result);
            }

            // Store results
            if (results.length > 0) {
                await dataset.pushData(results);
            }

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

