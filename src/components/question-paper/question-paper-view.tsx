"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface QuestionPaperViewProps {
  id: string;
}

interface QuestionItem {
  id: string;
  marks?: number;
  question: {
    id: string;
    text: string;
    type: string;
    difficulty: string;
    marks: number;
    options?: string;
    isActive: boolean;
  };
}

interface PaperSection {
  id: string;
  name: string;
  instructions?: string;
  questions: QuestionItem[];
}

export default function QuestionPaperView({ id }: QuestionPaperViewProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const router = useRouter();

  const { data: paper, isLoading, error } = api.questionPaper.getQuestionPaperById.useQuery(
    { id },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !paper) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load question paper. It may have been deleted or you don't have access.</p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/question-papers">Back to Question Papers</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/question-papers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Question Papers
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="text-center print:pb-0">
          <div className="flex justify-center">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold">{paper.title}</h1>
              {paper.description && (
                <p className="mt-2 text-sm text-muted-foreground">{paper.description}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Class</span>
                <span className="font-medium">
                  {paper.blueprint.class.name} {paper.blueprint.class.section}
                </span>
              </div>
              {paper.blueprint.board && (
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Board</span>
                  <span className="font-medium">{paper.blueprint.board.name}</span>
                </div>
              )}
              {paper.duration && (
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-medium">{paper.duration} minutes</span>
                </div>
              )}
              {paper.totalMarks && (
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Total Marks</span>
                  <span className="font-medium">{paper.totalMarks}</span>
                </div>
              )}
              <div className="flex flex-col print:hidden">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(paper.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {paper.sections.map((section: PaperSection, index: number) => (
              <div key={section.id} className="rounded-md border p-4 print:border-none">
                <h2 className="text-xl font-bold">
                  {section.name}
                  {section.questions.length > 0 && section.questions[0]?.question.marks && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({section.questions.length} questions, {section.questions.reduce(
                        (total: number, q: QuestionItem) => total + (q.marks || q.question.marks),
                        0
                      )} marks)
                    </span>
                  )}
                </h2>
                
                {section.instructions && (
                  <div className="mt-2 italic text-sm text-muted-foreground">
                    {section.instructions}
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <ol className="list-decimal space-y-6 pl-6">
                  {section.questions.map((questionItem: QuestionItem) => {
                    const question = questionItem.question;
                    return (
                      <li key={questionItem.id} className="pl-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div dangerouslySetInnerHTML={{ __html: question.text }} />
                            
                            {question.type === 'MCQ' && question.options && (
                              <div className="mt-2 space-y-1">
                                {(() => {
                                  try {
                                    const parsedOptions = JSON.parse(question.options);
                                    if (Array.isArray(parsedOptions)) {
                                      return parsedOptions.map((option: string, optIndex: number) => (
                                        <div key={optIndex} className="flex items-center">
                                          <span className="mr-2 text-sm font-medium">
                                            {String.fromCharCode(97 + optIndex)})
                                          </span>
                                          <span>{option}</span>
                                        </div>
                                      ));
                                    }
                                    return null;
                                  } catch (e) {
                                    console.error("Failed to parse options:", e);
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                            
                            <div className="mt-1 flex items-center gap-2 print:hidden">
                              <Badge variant="outline">{question.type}</Badge>
                              <Badge variant="outline">{question.difficulty}</Badge>
                            </div>
                          </div>
                          <div className="ml-4 flex-none">
                            <Badge variant="secondary">
                              {questionItem.marks || question.marks} marks
                            </Badge>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 