import * as cheerio from 'cheerio'

async function getIconPagesFromListing(listingURL: string) {
    let currentURL: string | undefined = listingURL
    const listingPages: string[] = []
    const iconPages: {url: string, title: string}[] = []

    while(currentURL !== undefined) {
        listingPages.push(currentURL)

        const response = await fetch(currentURL)
        const text = await response.text()

        const $ = cheerio.load(text)

        iconPages.push(...$('.icondetail').toArray().map(e => ({
            url: new URL($( 'a', e).attr('href')!, listingURL).toString(),
            title: $('img', e).attr('title')!
        })))

        currentURL = $('a[title="Next page"]').attr('href')
        if(currentURL !== undefined) {
            currentURL = new URL(currentURL, listingURL).toString()
        }
    }

    return {listingPages, iconPages}
}

async function test() {
    const pages = await getIconPagesFromListing('https://www.iconarchive.com/show/papirus-places-icons-by-papirus-team.1.html')
    console.log(pages)
}

test()