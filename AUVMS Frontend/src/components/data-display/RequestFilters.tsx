import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/input/input';
import { Button } from '@/components/input/button';
import { Label } from '@/components/input/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/input/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/overlay/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/layout-ui/command';
import { cn } from '@/lib/utils';
import { DatePickerInput } from '@/components/input/DatePickerInput';
import type { RequestFilters as IRequestFilters } from '@/services/requestsApi';

export interface RequestFiltersProps {
    filters: IRequestFilters;
    onFiltersChange: (filters: Partial<IRequestFilters>) => void;
    staffMembers?: Array<{ id: string; name: string }>;
    departments?: Array<{ id: string; name: string }>;
}

export function RequestFilters({
    filters,
    onFiltersChange,
    staffMembers = [],
    departments = [],
}: RequestFiltersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [staffOpen, setStaffOpen] = useState(false);
    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.fromDate ? new Date(filters.fromDate) : undefined
    );
    // Compute filtered staff based on search term
    const filteredStaff = staffMembers.filter((staff) =>
        staff.name.toLowerCase().includes(staffSearchTerm.toLowerCase())
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.toDate ? new Date(filters.toDate) : undefined
    );

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== filters.search) {
                onFiltersChange({ search: searchTerm });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleStatusChange = (value: string) => {
        onFiltersChange({ status: value === 'all' ? '' : value });
    };

    const handleStaffChange = (value: string) => {
        onFiltersChange({ staffId: value === 'all' ? '' : value });
    };

    const handleDepartmentChange = (value: string) => {
        onFiltersChange({ departmentId: value === 'all' ? '' : value });
    };

    const handleFromDateChange = (date: Date | undefined) => {
        setFromDate(date);
        onFiltersChange({ fromDate: date ? date.toISOString() : '' });
    };

    const handleToDateChange = (date: Date | undefined) => {
        setToDate(date);
        onFiltersChange({ toDate: date ? date.toISOString() : '' });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFromDate(undefined);
        setToDate(undefined);
        onFiltersChange({
            search: '',
            status: '',
            staffId: '',
            departmentId: '',
            fromDate: '',
            toDate: '',
        });
    };

    const hasActiveFilters =
        filters.search ||
        filters.status ||
        filters.staffId ||
        filters.departmentId ||
        filters.fromDate ||
        filters.toDate;

    return (
        <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <Select
                    value={filters.status || 'all'}
                    onValueChange={handleStatusChange}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                {/* Staff Filter (Admin only) - Combobox */}
                {staffMembers.length > 0 && (
                    <Popover open={staffOpen} onOpenChange={setStaffOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={staffOpen}
                                className="w-[200px] justify-between"
                            >
                                {filters.staffId
                                    ? staffMembers.find((staff) => staff.id === filters.staffId)?.name
                                    : "Meeting Person"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Search staff..."
                                    value={staffSearchTerm}
                                    onValueChange={setStaffSearchTerm}
                                />
                                <CommandList>
                                    <CommandEmpty>No staff found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => {
                                                handleStaffChange('all');
                                                setStaffOpen(false);
                                                setStaffSearchTerm('');
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    !filters.staffId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            All Staff
                                        </CommandItem>
                                        {filteredStaff.map((staff) => (
                                            <CommandItem
                                                key={staff.id}
                                                value={staff.name}
                                                onSelect={() => {
                                                    handleStaffChange(staff.id === filters.staffId ? "" : staff.id);
                                                    setStaffOpen(false);
                                                    setStaffSearchTerm('');
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        filters.staffId === staff.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {staff.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Department Filter */}
                {departments.length > 0 && (
                    <Select
                        value={filters.departmentId || 'all'}
                        onValueChange={handleDepartmentChange}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Date Range Filter */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            Date Range
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="from-date">From Date</Label>
                                <DatePickerInput
                                    value={fromDate}
                                    onChange={handleFromDateChange}
                                    placeholder="Select start date"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="to-date">To Date</Label>
                                <DatePickerInput
                                    value={toDate}
                                    onChange={handleToDateChange}
                                    placeholder="Select end date"
                                />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                    </Button>
                )}
            </div>
        </div>
    );
}

export default RequestFilters;
