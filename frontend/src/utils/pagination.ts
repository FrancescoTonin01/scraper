export type PaginationItem = number | "...";

export function getPaginationItems(page: number, totalPages?: number | null): PaginationItem[] {
  if (totalPages == null) return [page];

  const pages: PaginationItem[] = [];
  const delta = 2;

  for (let index = 1; index <= totalPages; index++) {
    if (
      index === 1 ||
      index === totalPages ||
      (index >= page - delta && index <= page + delta)
    ) {
      pages.push(index);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return pages;
}
