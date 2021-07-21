const functions = require('firebase-functions');
const axios = require('axios');
const client = require('@notionhq/client')


exports.exportToNotion = functions.region('asia-southeast2').https.onRequest(async (req, res) => {
    const data = req.body;

    let errors = [];

    if (!("notion_key" in data)) {
        errors.push("Notion integration key not provided!");
    }

    // if (!("database_id" in data)) {
    //     errors.push("Database ID not provided!");
    // }

    if (!("libby_url" in data)) {
        errors.push("Libby url not provided!");
    }

    if (errors.length > 0) {
        res.status(401).send({ status: "error", data: errors })
    }

    const notion_key = data.notion_key;

    const notion = new client.Client({
        auth: notion_key
    });

    let database_obj;
    const search_result = await notion.search({
        filter: {
            value: "database",
            property: "object"
        }
    });
    // console.log("search result", search_result);

    if (search_result.results.length == 0) {
        const page_result = await notion.search({
            filter: {
                value: "page",
                property: "object"
            }
        })

        if (page_result.results.length == 0) {
            res.status(500).send({ status: "error", data: "No access to any page!" });
        }

        try {
            const create_result = await createDatabase(notion_key, page_result.results[0].id);
            database_obj = create_result.data;
        } catch (err) {
            res.status(500).send({ status: "error", message: "Failed to create database", data: err })
        }
    } else {
        database_obj = search_result.results[0];

        // TODO: Check database properties
    }

    let book_data;

    try {
        book_data = await axios.get(data.libby_url)
    } catch (err) {
        console.log(err);
        res.status(500).send({ status: "error", data: "Unable to retrieve book data from the given url" });
    }

    const existing_page = await getPageIfExist(notion_key, book_data.data.readingJourney.title.text, book_data.data.readingJourney.author);
    // console.log(existing_page);
    let response_data;

    if (existing_page && existing_page.id) {
        console.log("Page already exists!");
    } else {
        const export_result = await createPage(database_obj.id, notion_key, book_data.data)
        console.log(export_result);
        response_data = export_result;
    }

    res.json({ status: "success", message: "Successfully exported book highlights to Notion!", data: response_data });
})

async function createDatabase(key, page_id) {
    // console.log(key, page_id)
    const headers = {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "Notion-Version": "2021-05-13"
    }

    const parent = {
        type: "page_id",
        page_id: page_id
    }

    const properties = {
        Name: {
            title: {}
        },
        Author: {
            rich_text: {}
        },
        Progress: {
            number: {
                format: "percent"
            }
        },
        Publisher: {
            rich_text: {}
        },
        Url: {
            url: {}
        },
        Highlights: {
            number: {
                format: "number"
            }
        }

    }

    const data = {
        parent: parent,
        title: [
            {
                type: "text",
                text: {
                    content: "Books",
                    link: null
                }
            }
        ],
        properties: properties
    }

    return await axios.post("https://api.notion.com/v1/databases", data, {
        headers
    });
}

async function createPage(database_id, key, book_data) {
    const properties = {
        Name: {
            title: [
                {
                    text: {
                        content: book_data.readingJourney.title.text
                    }
                }
            ]
        },
        Author: {
            rich_text: [
                {
                    text: {
                        content: book_data.readingJourney.author
                    }
                }
            ]
        },
        Progress: {
            number: book_data.readingJourney.percent
        },
        Publisher: {
            rich_text: [
                {
                    text: {
                        content: book_data.readingJourney.publisher
                    }
                }
            ]
        },
        Url: {
            url: book_data.readingJourney.title.url
        },
        Highlights: {
            number: book_data.highlights.length
        }
    }

    let children = [];

    for (const highlight of book_data.highlights) {

        let block;
        if ("quote" in highlight) {
            block = createParagraph("Note: " + highlight.quote);
        } else {
            block = createParagraph(highlight.note);
        }

        children.push(block);
        children.push(createParagraph(""))
    }

    const notion = new client.Client({
        auth: key
    });

    const result = await notion.pages.create({
        parent: {
            database_id: database_id
        },
        properties: properties,
        children: children
    })

    return result;
}

function createParagraph(content) {
    const paragraph = {
        object: 'block',
        type: 'paragraph',
        paragraph: {
            text: [
                {
                    type: 'text',
                    text: {
                        content: content
                    }
                }
            ]
        }
    }

    return paragraph;
}

async function getPageIfExist(key, query, author) {
    let page_object;

    const notion = new client.Client({
        auth: key
    });

    const search_result = await notion.search({
        query: query,
        filter: {
            value: "page",
            property: "object"
        }
    });

    for (const result of search_result.results) {
        if ("Author" in result.properties
            && result.properties.Author.rich_text[0].plain_text == author
            && result.properties.Name.title[0].plain_text == query) {
                
            page_object = result;
        }
    }

    return page_object;
}