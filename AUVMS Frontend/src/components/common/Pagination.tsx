import { Button } from "@/components/input/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }: PaginationProps) => {
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handleFirst = () => {
        onPageChange(1);
    };

    const handleLast = () => {
        onPageChange(totalPages);
    };

    // Calculate visible page numbers (sliding window)
    const getVisiblePages = () => {
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + 4);

        // Adjust start if end is maxed out
        if (end === totalPages) {
            start = Math.max(1, end - 4);
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className={`flex items-center justify-center space-x-2 ${className}`}>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleFirst}
                disabled={currentPage === 1}
                title="First Page"
            >
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevious}
                disabled={currentPage === 1}
                title="Previous Page"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {getVisiblePages().map((page) => (
                <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 ${currentPage === page ? "gradient-primary" : ""}`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </Button>
            ))}

            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                title="Next Page"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleLast}
                disabled={currentPage === totalPages}
                title="Last Page"
            >
                <ChevronsRight className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground ml-2">
                Page {currentPage} of {totalPages}
            </span>
        </div>
    );
};
