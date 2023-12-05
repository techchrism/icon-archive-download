import * as cheerio from 'cheerio'
import path from 'node:path'
import {promises as fs} from 'node:fs'

async function getIconPagesFromListing(listingURL: string) {
    let currentURL: string | undefined = listingURL
    const listingPages: string[] = []
    const iconPages: {url: string, title: string}[] = []

    while(currentURL !== undefined) {
        listingPages.push(currentURL)

        const response = await fetch(currentURL)
        if(!response.ok) throw new Error(`Failed to fetch ${currentURL}`)
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

async function downloadIcon(iconPage: string, formats: string[], destDir: string) {
    const response = await fetch(iconPage)
    const text = await response.text()

    const $ = cheerio.load(text)
    const urls = $('a.downbutton').map((i, e) => $(e).attr('href')).toArray()
    const uniqueUrls = [...new Set(urls)]
    const passingUrls = uniqueUrls.filter(url => formats.some(format => url.endsWith(format)))

    for(const url of passingUrls) {
        const response = await fetch(url)
        if(!response.ok) throw new Error(`Failed to download ${url}`)
        const buffer = await response.arrayBuffer()
        const filename = url.split('/').pop()!
        await fs.writeFile(path.join(destDir, filename), Buffer.from(buffer))
    }
}

async function test() {
    const pages = await getIconPagesFromListing('https://www.iconarchive.com/show/papirus-places-icons-by-papirus-team.1.html')
    console.log(pages)

    await fs.mkdir('icons', {recursive: true})
    await downloadIcon(pages.iconPages[0].url, ['.512.png', '.svg'], 'icons')
}

test()