# Advanced Filter Component

A reusable advanced filter component that provides a consistent filtering interface across different pages.

## Features

- **Reusable**: Can be used across different pages with different data types
- **Configurable**: Supports custom filter categories and options
- **Adaptive**: Automatically converts between UI filters and backend query filters
- **Consistent UI**: Matches the design patterns used throughout the application
- **Search Support**: Includes real-time search within filter options
- **Pure Black Text**: Consistent text styling with proper contrast

## Components

### `AdvancedFilter`
The main filter component that renders the filter UI.

### `useAdvancedFilterAdapter`
A hook that handles conversion between advanced filters and UI filters.

## Usage Example

```tsx
import { 
  AdvancedFilter, 
  useAdvancedFilterAdapter,
  type AdvancedFilters,
  type FilterCategory,
  type FilterMapping
} from "@/components/ui/advanced-filter";

// Define your filter types
enum StudentFilterType {
  CLASS = "Class",
  SECTION = "Section", 
  STATUS = "Status",
}

// Configure filter mapping (how UI values map to API fields)
const filterMapping: FilterMapping = {
  [StudentFilterType.CLASS]: {
    field: "classId",
    valueMapper: (displayValue: string, options: any[]) => {
      const cls = options.find((c: any) => c.name === displayValue);
      return cls?.id ?? "";
    },
    displayMapper: (fieldValue: string, options: any[]) => {
      const cls = options.find((c: any) => c.id === fieldValue);
      return cls?.name ?? "";
    }
  },
  [StudentFilterType.STATUS]: {
    field: "isActive",
    valueMapper: (displayValue: string) => displayValue === "Active" ? "true" : "false",
    displayMapper: (fieldValue: string) => fieldValue === "true" ? "Active" : "Inactive"
  }
};

function StudentFilter({ filters, onFilterChange }) {
  // Fetch your data
  const { data: classes = [] } = api.class.getAll.useQuery();
  
  // Configure data options for the adapter
  const dataOptions = {
    [StudentFilterType.CLASS]: classes,
    [StudentFilterType.STATUS]: []
  };

  // Use the adapter hook
  const { uiFilters, setUiFilters } = useAdvancedFilterAdapter(
    filters,
    onFilterChange,
    filterMapping,
    dataOptions
  );

  // Configure filter categories
  const filterCategories: FilterCategory[][] = [
    [
      {
        name: StudentFilterType.CLASS,
        icon: <GraduationCap className="size-3.5" />,
        options: classes.map((cls: any) => ({
          name: cls.name,
          icon: <GraduationCap className="size-3.5 text-purple-500" />,
        }))
      },
      {
        name: StudentFilterType.STATUS,
        icon: <Users className="size-3.5" />,
        options: [
          {
            name: "Active",
            icon: <Users className="size-3.5 text-green-500" />,
          },
          {
            name: "Inactive", 
            icon: <Users className="size-3.5 text-gray-500" />,
          },
        ]
      },
    ],
  ];

  return (
    <AdvancedFilter
      categories={filterCategories}
      filters={uiFilters}
      onFiltersChange={setUiFilters}
      placeholder="Search student filters..."
    />
  );
}
```

## Props

### AdvancedFilter Props

| Prop | Type | Description |
|------|------|-------------|
| `categories` | `FilterCategory[][]` | Array of filter category groups |
| `filters` | `UIFilter[]` | Current active filters |
| `onFiltersChange` | `(filters: UIFilter[]) => void` | Callback when filters change |
| `placeholder` | `string` | Placeholder text for search input |
| `className` | `string` | Additional CSS classes |

### FilterCategory

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name of the category |
| `icon` | `React.ReactNode` | Icon for the category |
| `options` | `FilterOption[]` | Available filter options |

### FilterOption

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name of the option |
| `icon` | `React.ReactNode` | Icon for the option |
| `value` | `string` (optional) | Custom value, defaults to name |

### FilterMapping

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | Backend field name |
| `valueMapper` | `(displayValue: string, options: any[]) => string` | Convert display value to field value |
| `displayMapper` | `(fieldValue: string, options: any[]) => string` | Convert field value to display value |

## Benefits

1. **Consistency**: Same look and feel across all pages
2. **Maintainability**: Single component to update for UI changes
3. **Flexibility**: Easy to configure for different data types
4. **Performance**: Efficient filtering and search
5. **Accessibility**: Proper keyboard and mouse support
6. **Type Safety**: Full TypeScript support

## Integration

The component integrates seamlessly with:
- tRPC API queries
- Existing UI filter system
- Branch and session contexts
- Toast notifications
- Loading states

This makes it easy to add advanced filtering to any page in the application. 