import config from 'config'
/**
 * Adjust the config provided to the current store selected via request params
 * @param Object config configuration
 * @param Express request req
 */
export function multiStoreConfig(apiConfig, req) {
    let confCopy = Object.assign({}, apiConfig)
    let storeCode = ''

    if (req.headers['x-vs-store-code']) {
        storeCode = req.headers['x-vs-store']
    }
    if (req.query.storeCode) {
        storeCode = req.query.storeCode
    }

    if (storeCode && config.availableStores.indexOf(storeCode) >= 0)
    {
        if (config.magento1['api_' + storeCode]) {
            confCopy = Object.assign({}, config.magento1['api_' + storeCode]) // we're to use the specific api configuration - maybe even separate magento instance
        } else {
            if (new RegExp("(/" + config.availableStores.join("|") + "/)", "gm").exec(confCopy.url) === null) {
                confCopy.url = (confCopy.url).replace(/(vsbridge)/gm, `${storeCode}/$1`);
            }
        }
    } else {
        if (storeCode) {
            console.error('Unavailable store code', storeCode)
        }
    }

    return confCopy
}
