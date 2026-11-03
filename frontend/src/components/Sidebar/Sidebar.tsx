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
  return (
    <aside className="sidebar">
      <h1>Syntax Scholars</h1>

      {book && (
        <>
          <h2>{book.title}</h2>
          <p>{book.page_count} pages</p>

          <div className="page-list">
            {/* Display PDF bookmarks as clickable chapter and lesson titles. */}
            {(book.table_of_contents ?? []).map((entry, index) => (
              <button
                key={`toc-${index}`}
                className="page-item"
                style={{
                  paddingLeft: 13 + (entry.level - 1) * 16,
                }}
                onClick={() => onPageChange(entry.page - 1)}
              >
                {entry.title}
              </button>
            ))}
            {book.pages.map((page, index) => (
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