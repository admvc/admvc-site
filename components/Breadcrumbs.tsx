import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-wide text-muted mb-6">
            <Link href="/admin" className="hover:text-figueira transition-colors">
                Dashboard
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="text-soft">/</span>
                    {item.href ? (
                        <Link href={item.href} className="hover:text-figueira transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-fg">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
}