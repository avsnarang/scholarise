"use client"

import { useState } from "react"
import type { ColumnDef, Row } from "@tanstack/react-table"
import AdvancedDataTable from "./advanced-data-table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Define the data type for our example
type UserData = {
  id: string
  name: string
  email: string
  location: string
  flag: string
  status: "Active" | "Inactive" | "Pending"
  balance: number
}

// Sample data for demonstration
const sampleData: UserData[] = [
  {
    id: "1",
    name: "Alex Thompson",
    email: "alex.t@company.com",
    location: "San Francisco, US",
    flag: "🇺🇸",
    status: "Active",
    balance: 1250.00,
  },
  {
    id: "2", 
    name: "Sarah Chen",
    email: "sarah.c@company.com",
    location: "Singapore",
    flag: "🇸🇬",
    status: "Active",
    balance: 600.00,
  },
  {
    id: "3",
    name: "James Wilson", 
    email: "j.wilson@company.com",
    location: "London, UK",
    flag: "🇬🇧",
    status: "Inactive",
    balance: 650.00,
  },
  {
    id: "4",
    name: "Maria Garcia",
    email: "m.garcia@company.com", 
    location: "Madrid, Spain",
    flag: "🇪🇸",
    status: "Active",
    balance: 0.00,
  },
  {
    id: "5",
    name: "David Kim",
    email: "d.kim@company.com",
    location: "Seoul, KR", 
    flag: "🇰🇷",
    status: "Pending",
    balance: -1000.00,
  },
]

// Define columns for the user table
const userColumns: ColumnDef<UserData>[] = [
  {
    header: "Name",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    size: 180,
    enableHiding: false,
  },
  {
    header: "Email",
    accessorKey: "email",
    size: 220,
  },
  {
    header: "Location",
    accessorKey: "location",
    cell: ({ row }) => (
      <div>
        <span className="text-lg leading-none">{row.original.flag}</span>{" "}
        {row.getValue("location")}
      </div>
    ),
    size: 180,
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge
        className={cn(
          row.getValue("status") === "Inactive" &&
            "bg-muted-foreground/60 text-primary-foreground"
        )}
      >
        {row.getValue("status")}
      </Badge>
    ),
    size: 100,
  },
  {
    header: "Balance",
    accessorKey: "balance",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("balance"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return formatted
    },
    size: 120,
  },
]

export default function AdvancedDataTableExample() {
  const [data, setData] = useState<UserData[]>(sampleData)

  const handleAddUser = () => {
    // Add new user logic
    console.log("Add new user clicked")
  }

  const handleDeleteRows = (selectedRows: Row<UserData>[]) => {
    // Custom delete logic
    const updatedData = data.filter(
      (item) => !selectedRows.some((row) => row.original.id === item.id)
    )
    setData(updatedData)
    console.log(`Deleted ${selectedRows.length} rows`)
  }

  const handleRowAction = (action: string, row: Row<UserData>) => {
    console.log(`Action ${action} on user:`, row.original.name)
    if (action === 'delete') {
      setData(prev => prev.filter(item => item.id !== row.original.id))
    }
  }

  return (
    <div className="container mx-auto py-10">
      <AdvancedDataTable<UserData>
        data={data}
        columns={userColumns}
        title="User Management"
        description="Manage your users with advanced filtering and sorting capabilities."
        addButtonText="Add User"
        deleteButtonText="Delete Users"
        searchPlaceholder="Filter by name or email..."
        searchColumns={['name', 'email']}
        filterConfigs={[
          {
            column: 'status',
            title: 'Status',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
              { label: 'Pending', value: 'Pending' }
            ]
          }
        ]}
        onAddClick={handleAddUser}
        onDeleteRows={handleDeleteRows}
        onRowAction={handleRowAction}
        enableRowSelection={true}
        enableSearch={true}
        enableColumnVisibility={true}
        enablePagination={true}
        initialPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
      />
    </div>
  )
}

// Alternative usage with fetch URL (for external data)
export function AdvancedDataTableWithFetch() {
  const handleAddUser = () => {
    console.log("Add new user clicked")
  }

  const handleDeleteRows = (selectedRows: Row<UserData>[]) => {
    console.log(`Delete ${selectedRows.length} rows`)
    // Handle deletion via API call
  }

  const handleRowAction = (action: string, row: Row<UserData>) => {
    console.log(`Action ${action} on user:`, row.original.name)
  }

  return (
    <div className="container mx-auto py-10">
      <AdvancedDataTable<UserData>
        fetchUrl="https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/users-01_fertyx.json"
        columns={userColumns}
        title="User Management (Fetched)"
        description="Data loaded from external API with advanced table features."
        searchColumns={['name', 'email']}
        filterConfigs={[
          {
            column: 'status',
            title: 'Status',
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
              { label: 'Pending', value: 'Pending' }
            ]
          }
        ]}
        onAddClick={handleAddUser}
        onDeleteRows={handleDeleteRows}
        onRowAction={handleRowAction}
      />
    </div>
  )
}

// Example with different data type to show reusability
type ProductData = {
  id: string
  name: string
  category: string
  price: number
  stock: number
  status: "In Stock" | "Out of Stock" | "Low Stock"
}

const productColumns: ColumnDef<ProductData>[] = [
  {
    header: "Product Name",
    accessorKey: "name",
    enableHiding: false,
  },
  {
    header: "Category",
    accessorKey: "category",
  },
  {
    header: "Price",
    accessorKey: "price",
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price)
    },
  },
  {
    header: "Stock",
    accessorKey: "stock",
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("status") === "In Stock" ? "default" : "destructive"}>
        {row.getValue("status")}
      </Badge>
    ),
  },
]

export function ProductDataTableExample() {
  const productData: ProductData[] = [
    {
      id: "1",
      name: "Laptop Pro",
      category: "Electronics",
      price: 1299.99,
      stock: 25,
      status: "In Stock",
    },
    {
      id: "2",
      name: "Coffee Mug",
      category: "Kitchen",
      price: 14.99,
      stock: 0,
      status: "Out of Stock",
    },
    {
      id: "3",
      name: "Desk Chair",
      category: "Furniture",
      price: 299.99,
      stock: 3,
      status: "Low Stock",
    },
  ]

  return (
    <div className="container mx-auto py-10">
      <AdvancedDataTable<ProductData>
        data={productData}
        columns={productColumns}
        title="Product Inventory"
        description="Manage product stock and details."
        addButtonText="Add Product"
        searchColumns={['name', 'category']}
        filterConfigs={[
          {
            column: 'status',
            title: 'Stock Status',
            options: [
              { label: 'In Stock', value: 'In Stock' },
              { label: 'Out of Stock', value: 'Out of Stock' },
              { label: 'Low Stock', value: 'Low Stock' },
            ]
          },
          {
            column: 'category',
            title: 'Category',
            options: [
              { label: 'Electronics', value: 'Electronics' },
              { label: 'Clothing', value: 'Clothing' },
              { label: 'Books', value: 'Books' },
            ]
          }
        ]}
        onAddClick={() => console.log('Add new product')}
        onRowAction={(action, row) => console.log(`Action ${action} on product`, row.original.name)}
      />
    </div>
  );
} 