import type { Book } from '../../types/book'
import './Sidebar.css'

type SidebarProps = {
  book: Book | null
  currentPage: number
  onPageChange: (page: number) => void
}

function Sidebar({
  book,
  currentPage,
  onPageChange,
}: SidebarProps) {

  // Keep bookmarks that point to an available page.
  const table_of_contents = (book?.table_of_contents ?? []).filter(
    (entry) =>
      entry.page >= 1 &&
      entry.page <= (book?.pages.length ?? 0)
  )
  // Highlight the closest preceding bookmark as the reader changes pages.
  let active_entry_index = -1

  table_of_contents.forEach((entry, index) => {
    if (
      entry.page <= currentPage + 1 &&
      (
        active_entry_index === -1 ||
        entry.page >= table_of_contents[active_entry_index].page
      )
    ) {
      active_entry_index = index
    }
  })

  return (
    <aside className="sidebar">
      <h1>Syntax Scholars</h1>

      {book && (
        <>
          <h2>{book.title}</h2>
          <p>{book.page_count} pages</p>
          <p className="navigation-label">
            {table_of_contents.length > 0
              ? 'Table of contents'
              : 'Pages'}
          </p>

          <div className="page-list">
            {/* Display PDF bookmarks as clickable chapter and lesson titles. */}
             {table_of_contents.map((entry, index) => (
              <button
                key={`toc-${index}`}

                className={
                `page-item ${entry.level === 1 ? 'chapter-item' : ''} ${
                index === active_entry_index ? 'active' : ''
                }`
              }
                style={{
                  paddingLeft: 13 + (entry.level - 1) * 16,
                }}
                onClick={() => onPageChange(entry.page - 1)}
              >
                <span className="navigation-title">{entry.title}</span>
                <span className="navigation-page">p. {entry.page}</span>
                </button>
            ))}
            {table_of_contents.length === 0 && book.pages.map((page, index) => (
              <button
                key={page.page}
                className={
                  index === currentPage
                    ? 'page-item active'
                    : 'page-item'
                }
                onClick={() => onPageChange(index)}
              >
                Page {page.page}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

export default Sidebar