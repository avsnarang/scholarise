"use client";

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Mail, 
  Phone, 
  Bug,
  ArrowLeft,
  Home,
  ExternalLink
} from 'lucide-react';
import { formatFinanceError, FinanceValidationError, FinanceBusinessRuleError } from "@/lib/finance-validation";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class FinanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `FIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to monitoring service
    console.error('Finance Module Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In a real app, this would send to error reporting service
    console.log('Error Report:', errorReport);
    
    // For demo, we'll copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error report copied to clipboard. Please send this to support.');
    });
  };

  getErrorCategory = (error: Error): string => {
    if (error instanceof FinanceValidationError) {
      return 'Validation Error';
    }
    if (error instanceof FinanceBusinessRuleError) {
      return 'Business Rule Error';
    }
    if (error.name === 'ChunkLoadError') {
      return 'Network Error';
    }
    if (error.message.includes('fetch')) {
      return 'API Error';
    }
    if (error.message.includes('permission')) {
      return 'Permission Error';
    }
    return 'System Error';
  };

  getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    if (error instanceof FinanceValidationError) {
      return 'low';
    }
    if (error instanceof FinanceBusinessRuleError) {
      return 'medium';
    }
    if (error.name === 'ChunkLoadError') {
      return 'high';
    }
    if (error.message.includes('database') || error.message.includes('server')) {
      return 'critical';
    }
    return 'medium';
  };

  getSuggestions = (error: Error): string[] => {
    const suggestions: string[] = [];

    if (error instanceof FinanceValidationError) {
      suggestions.push('Please check your input and try again');
      suggestions.push('Ensure all required fields are filled correctly');
    } else if (error instanceof FinanceBusinessRuleError) {
      suggestions.push('Review the business rules and constraints');
      suggestions.push('Contact your system administrator if needed');
    } else if (error.name === 'ChunkLoadError') {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
    } else if (error.message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('The server might be temporarily unavailable');
      suggestions.push('Try again in a few moments');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const formattedError = formatFinanceError(error);
      const category = this.getErrorCategory(error);
      const severity = this.getErrorSeverity(error);
      const suggestions = this.getSuggestions(error);

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full space-y-6">
            {/* Main Error Card */}
            <Card className="shadow-lg border-l-4 border-l-red-500">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-red-900">
                        Finance Module Error
                      </CardTitle>
                      <p className="text-sm text-red-600 mt-1">
                        Something went wrong while processing your request
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={severity === 'critical' ? 'destructive' : 'secondary'}
                      className={
                        severity === 'critical' ? '' :
                        severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {severity}
                    </Badge>
                    <Badge variant="outline">{category}</Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Error Message */}
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="font-medium">
                    {formattedError.message}
                  </AlertDescription>
                </Alert>

                {/* Error Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Error Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Error ID:</span>
                      <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
                        {this.state.errorId}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Error Code:</span>
                      <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
                        {formattedError.code}
                      </code>
                    </div>
                    {formattedError.field && (
                      <div>
                        <span className="font-medium text-gray-600">Field:</span>
                        <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-xs">
                          {formattedError.field}
                        </code>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Time:</span>
                      <span className="ml-2 text-gray-800">
                        {new Date().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">
                      Suggested Solutions
                    </h4>
                    <ul className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/finance'}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Back to Finance
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleReportError}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Report Error
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Support Information */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="font-medium text-gray-900">Need Help?</h3>
                  <p className="text-sm text-gray-600">
                    If this error persists, please contact our support team with the error ID.
                  </p>
                  
                  <div className="flex justify-center gap-4">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Support
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Support
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Help Center
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Development Information */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">
                    Development Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium mb-2">
                      Stack Trace
                    </summary>
                    <pre className="bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                  
                  {this.state.errorInfo && (
                    <details className="text-xs mt-3">
                      <summary className="cursor-pointer font-medium mb-2">
                        Component Stack
                      </summary>
                      <pre className="bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withFinanceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <FinanceErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </FinanceErrorBoundary>
    );
  };
}

// Hook for manual error reporting
export function useFinanceErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    const errorReport = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.error('Manual Error Report:', errorReport);
    
    // In a real app, send to error reporting service
  };

  return { reportError };
} 