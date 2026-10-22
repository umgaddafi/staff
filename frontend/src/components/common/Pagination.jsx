import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({
    currentPage = 1,
    totalItems = 0,
    pageSize = 15,
    pageSizeOptions = [10, 15, 25, 50],
    onPageChange,
    onPageSizeChange,
}) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems <= 0) return null;

    const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // Calculate visible page window
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
        pages.push(p);
    }

    return (
        <div className="admin-pagination-bar">
            <div className="admin-pagination-info">
                <span>
                    Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems.toLocaleString()}</strong> records
                </span>
                {onPageSizeChange && (
                    <div className="admin-pagination-size-select">
                        <label htmlFor="admin-page-size-select">Per page:</label>
                        <select
                            id="admin-page-size-select"
                            className="select admin-page-size-input"
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="admin-pagination-controls">
                <button
                    type="button"
                    className="admin-pagination-btn"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1}
                    title="First Page"
                    aria-label="First page"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    type="button"
                    className="admin-pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    title="Previous Page"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {startPage > 1 && (
                    <>
                        <button
                            type="button"
                            className={`admin-pagination-btn ${currentPage === 1 ? 'is-active' : ''}`}
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </button>
                        {startPage > 2 && <span className="admin-pagination-ellipsis">…</span>}
                    </>
                )}

                {pages.map((p) => (
                    <button
                        key={p}
                        type="button"
                        className={`admin-pagination-btn ${currentPage === p ? 'is-active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="admin-pagination-ellipsis">…</span>}
                        <button
                            type="button"
                            className={`admin-pagination-btn ${currentPage === totalPages ? 'is-active' : ''}`}
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    type="button"
                    className="admin-pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    title="Next Page"
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    type="button"
                    className="admin-pagination-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    title="Last Page"
                    aria-label="Last page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}
