export function parseOpml(xmlString: string): { title: string; url: string }[] {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, "text/xml")
  const outlines = xmlDoc.querySelectorAll("outline[type='rss']")
  
  const feeds: { title: string; url: string }[] = []

  outlines.forEach((outline) => {
    const title = outline.getAttribute("title") || outline.getAttribute("text") || "Untitled Show"
    const url = outline.getAttribute("xmlUrl")
    
    if (url) {
      feeds.push({ title, url })
    }
  })

  return feeds
}