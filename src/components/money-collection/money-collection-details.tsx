"use client";

import { format } from "date-fns";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  CalendarDays, 
  CreditCard, 
  Download, 
  FileDown,
  FileText,
  FileSpreadsheet, 
  PencilIcon, 
  School, 
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassSelector } from "@/components/money-collection/class-selector";
import { StudentCollectionTable } from "@/components/money-collection/student-collection-table";
import { MoneyCollectionItems } from "@/components/money-collection/money-collection-items";
import { api } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink,
  PDFViewer,
  Font 
} from '@react-pdf/renderer';

// Define a proper type that includes all the nested relationships
interface MoneyCollectionWithRelations {
  id: string;
  title: string;
  description: string | null;
  collectionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  branchId: string;
  sessionId?: string;
  branch: {
    name: string;
  };
  classes: Array<{
    id: string;
    classId: string;
    class: {
      name: string;
      section: string;
    }
  }>;
  session?: {
    id: string;
    name: string;
  };
  items: Array<any>;
}

interface MoneyCollectionDetailsProps {
  moneyCollection: any; // We'll cast this to our type inside the component
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 20,
    fontFamily: 'Open Sans',
  },
  header: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    fontSize: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
    fontSize: 9,
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableCellName: {
    flex: 2,
    paddingLeft: 5,
  },
  tableCellClass: {
    flex: 2,
    paddingLeft: 5,
  },
  tableCellAmount: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 5,
    fontWeight: 'bold',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    fontSize: 8,
    textAlign: 'center',
  },
});

// Register a font
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ]
});

// Helper function to get class information reliably
const getStudentClassInfo = (student: any, classMap?: Map<string, string>, classes?: any[]): string => {
  // If the student has embedded class information
  if (student.class && typeof student.class === 'object') {
    const className = student.class.name || '';
    const section = student.class.section || '';
    if (className) {
      return `${className}${section ? ' ' + section : ''}`;
    }
  }
  
  // If the student has a classId and we have a class map, try to find it
  if (student.classId && classMap?.has(student.classId)) {
    return classMap.get(student.classId)!;
  }
  
  // If the student has a classId and we have classes array, try to find it
  if (student.classId && classes && classes.length > 0) {
    const foundClass = classes.find(c => c.classId === student.classId);
    if (foundClass?.class) {
      return `${foundClass.class.name} ${foundClass.class.section || ''}`.trim();
    }
  }
  
  // If the student has className/classSection properties directly
  if (student.className) {
    return `${student.className}${student.classSection ? ' ' + student.classSection : ''}`;
  }
  
  // Last resort, check in class object if different properties
  if (student.class) {
    // Try alternative property names that might exist
    const possibleNameProps = ['name', 'className', 'class_name', 'grade'];
    const possibleSectionProps = ['section', 'classSection', 'section_name', 'division'];
    
    for (const prop of possibleNameProps) {
      if (student.class[prop]) {
        const className = student.class[prop];
        // Look for section
        for (const sectionProp of possibleSectionProps) {
          if (student.class[sectionProp]) {
            return `${className} ${student.class[sectionProp]}`;
          }
        }
        return className;
      }
    }
  }
  
  return "Not assigned";
};

// PDF Document component
const MoneyCollectionPDF = ({ collection }: { collection: MoneyCollectionWithRelations }) => {
  // Format amounts with proper Rupee symbol and formatting
  const formatCurrency = (amount: number) => {
    // Try using Rupee symbol with our custom font
    return `₹ ${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Calculate total amount
  const totalAmount = collection.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Create a class lookup map
  const classMap = new Map();
  if (collection.classes && collection.classes.length > 0) {
    collection.classes.forEach(cls => {
      if (cls.class) {
        classMap.set(cls.classId, `${cls.class.name} ${cls.class.section}`);
      }
    });
  }
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.header}>The Scholars' Home, {collection.branch?.name}</Text>
        <Text style={styles.title}>{collection.title}</Text>
        
        {/* Metadata */}
        <View style={styles.metaRow}>
          <Text>Collection Date: {format(new Date(collection.collectionDate), "PPP")}</Text>
          <Text>Report Generated: {format(new Date(), "PPP")}</Text>
        </View>
        
        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text>Total Students: {collection.items.length}</Text>
          <Text>Total Amount: {formatCurrency(totalAmount)}</Text>
        </View>
        
        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellName}>Student Name</Text>
            <Text style={styles.tableCellClass}>Class & Section</Text>
            <Text style={styles.tableCellAmount}>Amount (₹)</Text>
          </View>
          
          {/* Table Rows */}
          {collection.items.map((item, index) => {
            // Get class info using our helper function
            const classInfo = getStudentClassInfo(item.student, classMap, collection.classes);
            
            return (
              <View key={index} style={[
                styles.tableRow, 
                index % 2 === 1 ? styles.tableRowEven : {}
              ]}>
                <Text style={styles.tableCellName}>
                  {item.student.firstName} {item.student.lastName}
                </Text>
                <Text style={styles.tableCellClass}>{classInfo}</Text>
                <Text style={styles.tableCellAmount}>
                  {item.amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              </View>
            );
          })}
        </View>
        
        {/* Total */}
        <View style={styles.total}>
          <Text>Total: {formatCurrency(totalAmount)}</Text>
        </View>
        
        {/* Footer */}
        <Text style={styles.footer}>Page 1 of 1</Text>
      </Page>
    </Document>
  );
};

// PDF Modal component
const PDFModal = ({ isOpen, onClose, collection }: { 
  isOpen: boolean; 
  onClose: () => void; 
  collection: MoneyCollectionWithRelations 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Money Collection Report</h3>
          <div className="flex gap-2">
            <PDFDownloadLink 
              document={<MoneyCollectionPDF collection={collection} />} 
              fileName={`${collection.title.replace(/\s+/g, '_')}_report.pdf`}
              className="bg-primary text-white px-3 py-1 rounded text-sm"
            >
              {({ loading }) => (loading ? 'Preparing...' : 'Download')}
            </PDFDownloadLink>
            <button 
              onClick={onClose}
              className="bg-gray-200 px-3 py-1 rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <PDFViewer style={{ width: '100%', height: '100%' }}>
            <MoneyCollectionPDF collection={collection} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

export function MoneyCollectionDetails({ moneyCollection }: MoneyCollectionDetailsProps) {
  const { toast } = useToast();
  // Default to the first class if available, otherwise empty string
  const firstClassId = moneyCollection.classes && moneyCollection.classes.length > 0 
    ? moneyCollection.classes[0].classId 
    : "";
  
  const [selectedClassId, setSelectedClassId] = useState<string>(firstClassId);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Cast to our type with proper relations
  const typedCollection = moneyCollection as MoneyCollectionWithRelations;

  // Fetch students for the selected class
  const { data: classStudents, error: studentsError, isLoading: isLoadingClassStudents } = 
    api.moneyCollection.getDetailedStudentsByClass.useQuery(
      { classId: selectedClassId },
      {
        enabled: !!selectedClassId,
      }
    );

  // Update students when class students data changes
  useEffect(() => {
    if (classStudents) {
      setStudents(classStudents);
      setIsLoadingStudents(false);
    }
  }, [classStudents]);

  // Handle student data fetch errors
  useEffect(() => {
    if (studentsError) {
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
      setIsLoadingStudents(false);
    }
  }, [studentsError, toast]);

  // Handle class selection
  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setIsLoadingStudents(true);
  };

  // Calculate total collection amount
  const totalAmount = typedCollection.items.reduce((sum, item) => sum + item.amount, 0);
  const totalStudents = typedCollection.items.length;
  
  // Collection status
  const getCollectionStatus = () => {
    if (typedCollection.items.length === 0) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">No Payments</Badge>;
    }
    
    const isRecent = new Date(typedCollection.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (isRecent) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
    } else {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
    }
  };

  // Handle PDF view open
  const handleViewPDF = () => {
    setIsPDFModalOpen(true);
  };

  // Export functions
  const handleExportCSV = () => {
    // Create a class lookup map
    const classMap = new Map();
    if (typedCollection.classes && typedCollection.classes.length > 0) {
      typedCollection.classes.forEach(cls => {
        if (cls.class) {
          classMap.set(cls.classId, `${cls.class.name} ${cls.class.section}`);
        }
      });
    }

    // Gather data
    const rows = typedCollection.items.map(item => {
      // Get class info using our helper function
      const classInfo = getStudentClassInfo(item.student, classMap, typedCollection.classes);
      
      return [
        item.student.admissionNumber ||
          item.student.admissionNo ||
          item.student.studentId ||
          "",
        `${item.student.firstName} ${item.student.lastName}`,
        classInfo,
        `${item.amount.toFixed(2)}`,
      ];
    });
    
    // Create header row
    const headers = ["Admission Number", "Student Name", "Class & Section", "Amount Received"];
    
    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add title rows
    csvContent += `"The Scholars' Home, ${typedCollection.branch?.name}"\r\n`;
    csvContent += `"${typedCollection.title}"\r\n\r\n`;
    
    // Add headers
    csvContent += headers.join(",") + "\r\n";
    
    // Add data rows
    rows.forEach(row => {
      const formattedRow = row.map(cell => `"${cell}"`).join(",");
      csvContent += formattedRow + "\r\n";
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${typedCollection.title.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    
    // Trigger download and cleanup
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with back button and edit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1">
            <Link href="/money-collection">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <PageTitle heading={typedCollection.title} />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <FileDown className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>View as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="default" size="sm" className="h-8 gap-1">
            <Link href={`/money-collection/${typedCollection.id}/edit`}>
              <PencilIcon className="h-4 w-4" />
              <span>Edit</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Collection summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {totalStudents} student{totalStudents !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getCollectionStatus()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created on {format(new Date(typedCollection.createdAt), "PPP")}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Date</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {format(new Date(typedCollection.collectionDate), "PPP")}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branch</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {typedCollection.branch?.name ?? typedCollection.branchId}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Classes
          </CardTitle>
          <CardDescription>
            Classes included in this collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typedCollection.classes && typedCollection.classes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {typedCollection.classes.map((classItem) => (
                <Badge 
                  key={classItem.id} 
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                  variant="outline"
                >
                  {classItem.class.name} {classItem.class.section}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">All Classes</p>
          )}
        </CardContent>
      </Card>

      {/* Description if available */}
      {typedCollection.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{typedCollection.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="collect" className="mt-2">
        <TabsList>
          <TabsTrigger value="collect">Collect Payments</TabsTrigger>
          <TabsTrigger value="records">Payment Records</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collect" className="mt-4 space-y-6">
          {/* Class Selector with restricted classes */}
          <ClassSelector
            branchId={typedCollection.branchId}
            sessionId={typedCollection.sessionId}
            onClassSelect={handleClassSelect}
            selectedClassId={selectedClassId}
            allowedClassIds={typedCollection.classes && typedCollection.classes.length > 0 
              ? typedCollection.classes.map(c => c.classId) 
              : undefined}
          />

          {/* Show student collection table if a class is selected */}
          {selectedClassId && (
            <div>
              {isLoadingStudents || isLoadingClassStudents ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <StudentCollectionTable
                  students={students}
                  collectionId={typedCollection.id}
                  existingItems={typedCollection.items}
                />
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="records" className="mt-4">
          {typedCollection.items.length > 0 ? (
            <MoneyCollectionItems
              collectionId={typedCollection.id}
              items={typedCollection.items}
              students={[]} // We don't need to pass students for view-only
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-lg font-medium mb-1">No Payments Yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No payments have been collected for this drive yet.
                </p>
                <Button asChild variant="outline">
                  <Link href="#collect" onClick={() => {
                    const collectTab = document.querySelector('[data-value="collect"]');
                    if (collectTab instanceof HTMLElement) {
                      collectTab.click();
                    }
                  }}>
                    Start Collecting
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* PDF Modal */}
      <PDFModal 
        isOpen={isPDFModalOpen} 
        onClose={() => setIsPDFModalOpen(false)} 
        collection={typedCollection}
      />
    </div>
  );
} 