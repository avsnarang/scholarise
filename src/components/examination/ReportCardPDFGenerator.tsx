"use client";

import { useEffect, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { api } from "@/utils/api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAcademicSessionContext } from "@/hooks/useAcademicSessionContext";
import { useToast } from "@/components/ui/use-toast";

interface ReportCardPDFGeneratorProps {
  classId: string;
  sectionId: string;
  studentIds: string[];
  termIds: string[];
  templateType: string;
  onGenerationComplete: () => void;
  onProgress: (progress: number) => void;
}

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber?: number | null;
  admissionNumber?: string;
  fatherName?: string | null;
  motherName?: string | null;
  guardianName?: string | null;
  dateOfBirth?: Date;
  assessmentScores?: AssessmentScore[];
}

interface AssessmentScore {
  id: string;
  score: number;
  maxScore: number;
  subject: {
    name: string;
    code?: string;
  };
  assessment: {
    name: string;
    term: string;
  };
  grade?: string;
}

export function ReportCardPDFGenerator({
  classId,
  sectionId,
  studentIds,
  termIds,
  templateType,
  onGenerationComplete,
  onProgress
}: ReportCardPDFGeneratorProps) {
  const { currentBranchId } = useBranchContext();
  const { currentSessionId } = useAcademicSessionContext();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch class information
  const { data: classData } = api.class.getById.useQuery(
    { id: classId },
    { enabled: !!classId }
  );

  // Fetch branch information
  const { data: branchData } = api.branch.getById.useQuery(
    { id: currentBranchId || "" },
    { enabled: !!currentBranchId }
  );

  const generateReportCards = async () => {
    if (!studentIds || studentIds.length === 0) {
      toast({
        title: "No Students",
        description: "No students selected for report card generation.",
        variant: "destructive"
      });
      onGenerationComplete();
      return;
    }

    setIsProcessing(true);
    onProgress(0);

    try {
      // Load the PDF template
      const templateUrl = "/Templates/Classes 6-8 Half Yearly Report Card Template.pdf";
      const templateResponse = await fetch(templateUrl);
      
      if (!templateResponse.ok) {
        throw new Error(`Failed to load PDF template: ${templateResponse.status}`);
      }
      
      const templateBytes = await templateResponse.arrayBuffer();
      
      const zip = new JSZip();
      let completedCards = 0;

      // Generate sample student data for testing
      const sampleStudents = studentIds.map((id, index) => ({
        id,
        firstName: `Student${index + 1}`,
        lastName: `LastName${index + 1}`,
        rollNumber: index + 1,
        admissionNumber: `A${(index + 1).toString().padStart(3, '0')}`,
        fatherName: `Father${index + 1}`,
        motherName: `Mother${index + 1}`,
        guardianName: null,
        dateOfBirth: new Date(2010 + index, index % 12, (index % 28) + 1),
        assessmentScores: [],
      }));

      // Process each student
      for (const student of sampleStudents) {
        try {
          // Create a new PDF document from the template
          const pdfDoc = await PDFDocument.load(templateBytes);
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          
          if (!firstPage) {
            throw new Error("PDF template has no pages");
          }
          
          // Load fonts
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

          // Fill in student information
          await fillStudentInfo(firstPage, student, classData, branchData, font, boldFont);
          
          // Fill in assessment scores
          await fillAssessmentScores(firstPage, student, font, boldFont);

          // Calculate grades and overall performance
          await fillGradesAndPerformance(firstPage, student, font, boldFont);

          // Save the filled PDF
          const pdfBytes = await pdfDoc.save();
          const fileName = `${student.firstName}_${student.lastName}_Report_Card.pdf`;
          
          zip.file(fileName, pdfBytes);
          
          completedCards++;
          onProgress(Math.round((completedCards / sampleStudents.length) * 100));
          
          // Add a small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error generating report card for ${student.firstName} ${student.lastName}:`, error);
          toast({
            title: "Generation Error",
            description: `Failed to generate report card for ${student.firstName} ${student.lastName}`,
            variant: "destructive"
          });
        }
      }

      // Download the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const className = classData?.name || "Class";
      const sectionName = sectionId && sectionId !== "all" ? `_${sectionId}` : "";
      const zipFileName = `${className}${sectionName}_Report_Cards.zip`;
      
      saveAs(zipBlob, zipFileName);

      toast({
        title: "Success",
        description: `Generated ${completedCards} report cards successfully!`,
        variant: "default"
      });

    } catch (error) {
      console.error("Error in report card generation:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate report cards. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      onGenerationComplete();
    }
  };

  // Function to fill student information
  const fillStudentInfo = async (
    page: any, 
    student: StudentData, 
    classData: any, 
    branchData: any, 
    font: any, 
    boldFont: any
  ) => {
    // Based on the template coordinates, filling exact positions

    // Student Name - Left side
    page.drawText(`${student.firstName} ${student.lastName}`.toUpperCase(), {
      x: 135, // After "STUDENT'S NAME: "
      y: 646, // Y position for student name row
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Father's Name - Left side
    if (student.fatherName) {
      page.drawText(`${student.fatherName}`.toUpperCase(), {
        x: 155, // After "FATHER'S NAME: "
        y: 628, // Y position for father name row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Mother's Name - Left side
    if (student.motherName) {
      page.drawText(`${student.motherName}`.toUpperCase(), {
        x: 155, // After "MOTHER'S NAME: "
        y: 610, // Y position for mother name row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Admission Number - Right side
    if (student.admissionNumber) {
      page.drawText(`${student.admissionNumber}`, {
        x: 525, // After "ADMISSION NO.: "
        y: 646, // Y position for admission number row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Roll Number - Right side
    if (student.rollNumber) {
      page.drawText(`${student.rollNumber}`, {
        x: 755, // After "ROLL NO.: "
        y: 646, // Y position for roll number row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Class & Section - Right side
    if (classData) {
      page.drawText(`${classData.name}`, {
        x: 535, // After "CLASS & SECTION: "
        y: 628, // Y position for class row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Date of Birth - Right side
    if (student.dateOfBirth) {
      const dobFormatted = student.dateOfBirth.toLocaleDateString('en-GB'); // DD-MM-YYYY format
      page.drawText(dobFormatted, {
        x: 525, // After "DATE OF BIRTH: "
        y: 610, // Y position for DOB row
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });
    }
  };

  // Function to fill assessment scores
  const fillAssessmentScores = async (
    page: any, 
    student: StudentData, 
    font: any, 
    boldFont: any
  ) => {
    // Define the exact subjects and their positions based on the template
    const subjects = [
      "ENGLISH",
      "HINDI", 
      "MATHEMATICS",
      "SCIENCE",
      "SOCIAL SCIENCE",
      "SANSKRIT"
    ];

    // Starting position for the scholastic table
    let yPosition = 557; // First subject row Y position
    const rowHeight = 18; // Height between rows

    // Column X positions based on template
    const columnPositions = {
      subject: 65,
      periodicTest: 295,    // Periodic Test (5)
      multipleAssessment: 332, // Multiple Assessment (5) 
      portfolio: 365,       // Portfolio (5)
      subjectEnrichment: 405, // Subject Enrichment (5)
      hyExam: 445,         // H.Y Exam (80)
      grandTotal: 485,     // GRAND TOTAL (100)
      grade: 535           // GRADE
    };

    // Fill sample data for each subject (since assessment scores are empty for now)
    subjects.forEach((subjectName, index) => {
      const currentY = yPosition - (index * rowHeight);

      // Subject name
      page.drawText(subjectName, {
        x: columnPositions.subject,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Sample scores - these would come from actual assessment data
      const sampleScores = {
        periodicTest: Math.floor(Math.random() * 2) + 4, // 4-5
        multipleAssessment: Math.floor(Math.random() * 2) + 4, // 4-5  
        portfolio: 5, // Always 5
        subjectEnrichment: Math.floor(Math.random() * 2) + 4, // 4-5
        hyExam: Math.floor(Math.random() * 10) + 70, // 70-80
      };

      // Calculate grand total
      const grandTotal = sampleScores.periodicTest + sampleScores.multipleAssessment + 
                        sampleScores.portfolio + sampleScores.subjectEnrichment + sampleScores.hyExam;
      
      // Calculate grade
      const grade = calculateGrade((grandTotal / 100) * 100);

      // Fill in the scores
      page.drawText(sampleScores.periodicTest.toString(), {
        x: columnPositions.periodicTest,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sampleScores.multipleAssessment.toString(), {
        x: columnPositions.multipleAssessment,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sampleScores.portfolio.toString(), {
        x: columnPositions.portfolio,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sampleScores.subjectEnrichment.toString(), {
        x: columnPositions.subjectEnrichment,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(sampleScores.hyExam.toString(), {
        x: columnPositions.hyExam,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(grandTotal.toFixed(1), {
        x: columnPositions.grandTotal,
        y: currentY,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText(grade, {
        x: columnPositions.grade,
        y: currentY,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    });

    // Add percentage row
    const percentageY = yPosition - (subjects.length * rowHeight) - 5;
    page.drawText("95.9%", {
      x: columnPositions.grandTotal,
      y: percentageY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText("A1", {
      x: columnPositions.grade,
      y: percentageY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Add Computer Science in Additional Subjects section
    const additionalSubjectsY = percentageY - 40; // Position for additional subjects
    page.drawText("COMPUTER SCIENCE", {
      x: 65,
      y: additionalSubjectsY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Theory and Practical scores for Computer Science
    page.drawText("22.5", {
      x: 445, // Theory column
      y: additionalSubjectsY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText("25", {
      x: 485, // Practical column  
      y: additionalSubjectsY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText("47.5", {
      x: 525, // Grand Total column
      y: additionalSubjectsY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText("A1", {
      x: 565, // Grade column
      y: additionalSubjectsY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Add attendance
    const attendanceY = additionalSubjectsY - 25;
    page.drawText("92.5/95", {
      x: 525,
      y: attendanceY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
  };

  // Function to fill grades and performance
  const fillGradesAndPerformance = async (
    page: any, 
    student: StudentData, 
    font: any, 
    boldFont: any
  ) => {
    // Co-Scholastic Areas section
    const coScholasticY = 310; // Starting Y position for co-scholastic areas
    const coScholasticRowHeight = 15;

    // Left side co-scholastic subjects
    const leftSubjects = [
      { name: "HEALTH & FITNESS", grade: "" },
      { name: "YOGA & KARATE", grade: "B" },
      { name: "ART EDUCATION", grade: "" },
      { name: "VISUAL ARTS (SHELF SHASTRA)", grade: "C" },
      { name: "PERFORMING ART", grade: "B" },
      { name: "GENERAL KNOWLEDGE", grade: "" },
      { name: "GENERAL KNOWLEDGE", grade: "A" }
    ];

    leftSubjects.forEach((subject, index) => {
      const currentY = coScholasticY - (index * coScholasticRowHeight);
      
      // Subject name
      page.drawText(subject.name, {
        x: 65,
        y: currentY,
        size: 8,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Grade
      if (subject.grade) {
        page.drawText(subject.grade, {
          x: 260,
          y: currentY,
          size: 8,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    });

    // Right side disciplinary traits
    const disciplinaryX = 400;
    const disciplinaryTraits = [
      { name: "ATTENDANCE", grade: "B" },
      { name: "SINCERITY", grade: "A" },
      { name: "BEHAVIOUR", grade: "A" },
      { name: "VALUES", grade: "A" },
      { name: "HYGIENE", grade: "A" }
    ];

    disciplinaryTraits.forEach((trait, index) => {
      const currentY = coScholasticY - (index * coScholasticRowHeight * 1.2);
      
      // Trait name
      page.drawText(trait.name, {
        x: disciplinaryX,
        y: currentY,
        size: 8,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Grade
      page.drawText(trait.grade, {
        x: disciplinaryX + 120,
        y: currentY,
        size: 8,
        font: font,
        color: rgb(0, 0, 0),
      });
    });

    // Class Teacher's Remark
    const remarkY = 170;
    page.drawText(`${student.firstName} has a passion for learning and has a strong work ethic.`, {
      x: 65,
      y: remarkY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Issue Date
    const issueDateY = 140;
    const currentDate = new Date().toLocaleDateString('en-GB');
    page.drawText(currentDate, {
      x: 125, // After "ISSUE DATE: "
      y: issueDateY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Note: Signature lines are already in the template, so we don't need to add them
  };

  // Helper function to calculate grade
  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C+";
    if (percentage >= 40) return "C";
    if (percentage >= 33) return "D";
    return "F";
  };



  // Start generation immediately when component mounts (since it's only rendered when generating)
  useEffect(() => {
    generateReportCards();
  }, []); // Empty dependency array - only run once when mounted

  // This component doesn't render anything visible
  return null;
} 