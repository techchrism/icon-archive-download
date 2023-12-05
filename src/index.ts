import * as cheerio from 'cheerio'
import path from 'node:path'
import {promises as fs} from 'node:fs'
import {program} from 'commander'

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

async function main() {
    program
        .requiredOption('-u, --url <url>', 'The url of the icon listing')
        .requiredOption('-f, --formats <formats...>', 'The formats to download')
        .option('-d, --dest <dest>', 'The destination directory', 'icons')

    program.parse(process.argv)
    const options = program.opts()

    const url = options.url as string
    const formats = options.formats as string[]
    const dest = options.dest as string

    await fs.mkdir(dest, {recursive: true})
    console.log('Loading icon pages...')
    const data = await getIconPagesFromListing(url)
    await fs.writeFile(path.join(dest, 'data.json'), JSON.stringify(data, null, 4))
    console.group(`Downloading ${data.iconPages.length} icons...`)
    let i = 0
    for(const iconPage of data.iconPages) {
        console.log(`(${i + 1}/${data.iconPages.length}) Downloading ${iconPage.title}...`)
        await downloadIcon(iconPage.url, formats, dest)
        i++
    }
    console.groupEnd()
    console.log('Done!')
}

main().catch(e => {throw e})