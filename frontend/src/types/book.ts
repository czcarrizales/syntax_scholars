export type Page = {
  page: number
  text: string
}

export type Book = {
  title: string
  page_count: number
  pages: Page[]
}