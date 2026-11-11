export const EditorialArticlesSkeleton = ({
  label,
}: EditorialArticlesSkeleton.Props) => (
  <div
    role="status"
    aria-label={label}
    className="marketing-grid grid grid-cols-3 border-[var(--rail-color)] border-b data-[columns=1]:grid-cols-1 data-[columns=2]:grid-cols-2 data-[columns=4]:grid-cols-4 data-[columns=5]:grid-cols-5 max-sm:grid-cols-1 max-sm:data-[columns]:grid-cols-1 max-[801px]:grid-cols-2 max-[801px]:data-[columns]:grid-cols-2 [&>*]:min-w-0 [&>*]:border-[var(--rail-color)] [&>*]:border-t [&>*]:border-r [&>*]:px-7 [&>*]:py-8 max-sm:[&>*]:border-r-0 max-sm:[&>*]:px-4 max-sm:[&>*]:py-7 min-[801px]:data-ordered:[&>article]:py-10 [&_.marketing-item-link]:mt-7 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-2 [&_a:hover]:underline [&_a]:text-primary-text [&_a]:decoration-1 [&_a]:underline-offset-4 [&_h3]:max-w-[24ch] min-[801px]:data-ordered:[&_h3]:max-w-[20ch] [&_p]:mt-4"
  >
    {[0, 1, 2].map((index) => (
      <div key={index} aria-hidden="true" className="min-h-64">
        <div className="h-8 w-3/4 bg-background-dimmed" />
        <div className="mt-4 h-4 w-full bg-background-dimmed" />
        <div className="mt-2 h-4 w-3/4 bg-background-dimmed" />
        <div className="mt-8 h-4 w-1/2 bg-background-dimmed" />
      </div>
    ))}
  </div>
);

export namespace EditorialArticlesSkeleton {
  export type Props = { label: string };
}
