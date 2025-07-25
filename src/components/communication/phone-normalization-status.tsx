"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Phone, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Globe,
  ArrowRight
} from 'lucide-react';

interface PhoneNormalizationResult {
  original: string;
  normalized: string;
  countryCode: string;
  warnings: string[];
}

interface PhoneNormalizationStatsProps {
  results: PhoneNormalizationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  invalidNumbers?: Array<{ original: string; errors: string[] }>;
}

export function PhoneNormalizationStats({ 
  results, 
  stats, 
  invalidNumbers = [] 
}: PhoneNormalizationStatsProps) {
  const countryCodeStats = results.reduce((acc, result) => {
    acc[result.countryCode] = (acc[result.countryCode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasWarnings = stats.warnings > 0;
  const hasErrors = stats.invalid > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Number Normalization Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Numbers</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-sm text-green-600">Valid</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-sm text-yellow-600">Normalized</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-sm text-red-600">Invalid</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Success Rate</span>
            <span>{stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${stats.total > 0 ? (stats.valid / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Country Code Distribution */}
        {Object.keys(countryCodeStats).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country Code Distribution
            </h4>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(countryCodeStats).map(([countryCode, count]) => (
                <Badge key={countryCode} variant="outline" className="text-xs">
                  {countryCode}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.warnings} phone numbers were automatically normalized with country codes.
            </AlertDescription>
          </Alert>
        )}

        {/* Errors */}
        {hasErrors && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.invalid} phone numbers could not be normalized and may fail to send.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {!hasErrors && !hasWarnings && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All phone numbers are already in correct international format.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function PhoneNormalizationList({ 
  results,
  invalidNumbers = [],
  maxItems = 10 
}: {
  results: PhoneNormalizationResult[];
  invalidNumbers?: Array<{ original: string; errors: string[] }>;
  maxItems?: number;
}) {
  const normalizedResults = results.filter(r => r.warnings.length > 0).slice(0, maxItems);
  const displayInvalid = invalidNumbers.slice(0, maxItems);

  if (normalizedResults.length === 0 && displayInvalid.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No phone number changes were made</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Phone Number Changes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Normalized Numbers */}
        {normalizedResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Successfully Normalized ({normalizedResults.length})
            </h4>
            <div className="space-y-2">
              {normalizedResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-mono text-gray-600">{result.original}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-mono text-green-600">{result.normalized}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.countryCode}
                    </Badge>
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="text-xs text-muted-foreground max-w-xs">
                      {result.warnings[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {results.filter(r => r.warnings.length > 0).length > maxItems && (
              <p className="text-xs text-muted-foreground">
                ... and {results.filter(r => r.warnings.length > 0).length - maxItems} more
              </p>
            )}
          </div>
        )}

        {/* Invalid Numbers */}
        {displayInvalid.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Invalid Numbers ({displayInvalid.length})
            </h4>
            <div className="space-y-2">
              {displayInvalid.map((invalid, index) => (
                <div key={index} className="p-2 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-red-600">{invalid.original}</span>
                    <Badge variant="destructive" className="text-xs">
                      Invalid
                    </Badge>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {invalid.errors.join(', ')}
                  </div>
                </div>
              ))}
            </div>
            {invalidNumbers.length > maxItems && (
              <p className="text-xs text-muted-foreground">
                ... and {invalidNumbers.length - maxItems} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PhoneNormalizationToggle({ 
  enabled, 
  onToggle,
  className 
}: { 
  enabled: boolean; 
  onToggle: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between p-3 bg-blue-50 rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-blue-600" />
        <div>
          <div className="font-medium text-blue-900">Auto Phone Normalization</div>
          <div className="text-xs text-blue-600">
            Automatically add +91 country code to Indian mobile numbers
          </div>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        } transition-colors`}>
          <div className={`dot absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
      </label>
    </div>
  );
}

export function PhoneNormalizationInfo() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">Phone Number Normalization</p>
          <ul className="text-sm space-y-1">
            <li>• Automatically adds +91 to Indian mobile numbers (starting with 6-9)</li>
            <li>• Removes spaces, dashes, and other formatting characters</li>
            <li>• Validates phone number format for WhatsApp compatibility</li>
            <li>• Supports international numbers with proper country codes</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
} 