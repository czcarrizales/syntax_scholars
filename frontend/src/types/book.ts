export type Page = {
  page: number
  text: string
}

export type TocEntry = {
  level: number
  title: string
  page: number
}

export type Book = {
  title: string
  page_count: number
  pages: Page[]
  toc?: TocEntry[]
}