export type Page = {
  page: number
  text: string
}

// A PDF bookmark with its heading level, title, and destination page.
export type TocEntry = {
  level: number
  title: string
  page: number
}

export type Book = {
  title: string
  page_count: number
  pages: Page[]
  // Optional because some PDFs have no bookmarks
  table_of_contents?: TocEntry[]
}