"use client";

import React from "react";
import Image from "next/image";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src="/mobile_logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Terms and Conditions
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The Scholars' Home - Education Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="prose dark:prose-invert max-w-none">
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Terms of Service
            </h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This official Education Management System has been developed by The Scholars' Home to provide 
              educational services and information to students, faculty, and staff. Though all efforts have 
              been made to ensure the accuracy and currency of the content on this system, the same should 
              not be construed as a statement of law or used for any legal purposes beyond educational 
              administration.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The system contents are subject to change without prior notice. Users are responsible for 
              regularly checking for updates and changes to these terms and conditions.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Acceptance of Terms
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              By accessing and using this Education Management System, you acknowledge that you have read, 
              understood, and agree to be bound by these Terms and Conditions. If you do not agree to these 
              terms, please do not use this system.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              User Responsibilities and Conduct
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Users of this system agree to:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Use the system only for legitimate educational purposes</li>
              <li>Maintain the confidentiality of their login credentials</li>
              <li>Report any security breaches or unauthorized access immediately</li>
              <li>Respect the intellectual property rights of the institution and other users</li>
              <li>Comply with all applicable laws and institutional policies</li>
              <li>Use appropriate language and maintain professional conduct</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Prohibited Activities
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Users are expressly prohibited from:
            </p>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Attempting to gain unauthorized access to any part of the system</li>
              <li>Uploading or transmitting malicious software or harmful content</li>
              <li>Interfering with the proper functioning of the system</li>
              <li>Sharing login credentials or allowing unauthorized access</li>
              <li>Using the system for commercial purposes without authorization</li>
              <li>Violating the privacy or rights of other users</li>
              <li>Engaging in any form of harassment or discriminatory behavior</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Intellectual Property Rights
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              All content, materials, and resources available through this Education Management System, 
              including but not limited to text, graphics, logos, audio clips, digital downloads, and 
              software, are the property of the educational institution or its licensors and are protected 
              by copyright and other intellectual property laws.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Users may access and use the materials for personal educational purposes only. Any reproduction, 
              distribution, or commercial use of the materials requires express written permission from the 
              institution.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              System Availability and Maintenance
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              While we strive to maintain continuous system availability, we cannot guarantee uninterrupted 
              access. The system may be temporarily unavailable due to maintenance, updates, or unforeseen 
              technical issues. We reserve the right to modify, suspend, or discontinue any aspect of the 
              system at any time.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Data Protection and Privacy
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The institution is committed to protecting user privacy and personal data in accordance with 
              applicable data protection laws and educational privacy regulations. Please refer to our 
              Privacy Policy for detailed information about how we collect, use, and protect your data.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Academic Integrity
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Users are expected to maintain the highest standards of academic integrity when using this 
              system. Any form of academic dishonesty, including but not limited to plagiarism, cheating, 
              or unauthorized collaboration, is strictly prohibited and may result in disciplinary action.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Fee Payment and Financial Obligations
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The Scholars' Home uses secure online payment systems, including Razorpay Payment Gateway, 
              to collect fees and other charges. By using the payment system, you agree to the following:
            </p>

            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>All fees are quoted in Indian Rupees (INR) unless otherwise specified</li>
              <li>Payment of fees is mandatory for continued access to educational services</li>
              <li>Fee payment through the system indicates acceptance of the fee structure</li>
              <li>You are responsible for ensuring sufficient funds and valid payment methods</li>
              <li>Transaction fees, if applicable, will be clearly displayed before payment confirmation</li>
              <li>Payment confirmations and receipts will be provided electronically</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Payment Processing and Security
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              All payments are processed through secure, PCI DSS compliant payment gateways. The following 
              conditions apply to all payment transactions:
            </p>

            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>The Scholars' Home does not store complete credit/debit card information</li>
              <li>Payment processing may take 2-3 business days to reflect in your account</li>
              <li>Failed transactions will be automatically reversed within 5-7 business days</li>
              <li>You must verify payment completion and contact us for any discrepancies</li>
              <li>Payment gateway charges, if any, are non-refundable</li>
              <li>Multiple payment attempts may result in temporary account suspension</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Refund Policy
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Refunds for fees paid to The Scholars' Home are subject to the following conditions:
            </p>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Eligible Refunds:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Duplicate payments made due to technical errors</li>
              <li>Excess amount paid beyond the required fee</li>
              <li>Admission withdrawal before the academic session begins (subject to cancellation charges)</li>
              <li>System errors resulting in incorrect charge amounts</li>
            </ul>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Non-Refundable Items:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Tuition fees after the academic session has commenced</li>
              <li>Application and registration fees</li>
              <li>Examination fees once the examination process has begun</li>
              <li>Late fees and penalty charges</li>
              <li>Payment gateway transaction charges</li>
              <li>Services already availed or consumed</li>
            </ul>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Refund Process:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-1">
              <li>Refund requests must be submitted within 30 days of payment</li>
              <li>All refunds require written application with supporting documentation</li>
              <li>Refunds will be processed to the original payment method within 10-15 business days</li>
              <li>Bank charges for refund processing may be deducted from the refund amount</li>
              <li>Partial refunds may apply based on institutional policies and timing</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Fee Cancellation and Withdrawal Policy
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Students seeking to cancel their admission or withdraw from the institution are subject 
              to the following cancellation policy:
            </p>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Cancellation Before Academic Session:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Cancellation more than 30 days before session start: 90% refund of tuition fees</li>
              <li>Cancellation 15-30 days before session start: 75% refund of tuition fees</li>
              <li>Cancellation 7-14 days before session start: 50% refund of tuition fees</li>
              <li>Cancellation less than 7 days before session start: 25% refund of tuition fees</li>
            </ul>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Withdrawal During Academic Session:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1">
              <li>Withdrawal within first month: 50% refund of remaining term fees</li>
              <li>Withdrawal after first month: No refund of tuition fees</li>
              <li>Hostel and transportation fees prorated based on usage</li>
              <li>Library and other facility deposits refundable after clearance</li>
            </ul>

            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
              Special Circumstances:
            </h4>
            
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-1">
              <li>Medical emergencies: Case-by-case review with medical documentation</li>
              <li>Transfer to other institutions: Subject to institutional agreements</li>
              <li>Force majeure events: Refund/adjustment as per institutional policy</li>
              <li>Disciplinary dismissal: No refund of fees paid</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Limitation of Liability
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The educational institution shall not be liable for any direct, indirect, incidental, special, 
              or consequential damages resulting from the use or inability to use this system, even if 
              advised of the possibility of such damages. This includes, but is not limited to, damages for 
              loss of data, loss of profits, or business interruption.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              External Links and Third-Party Content
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This system may contain links to external websites and third-party educational resources. 
              The institution is not responsible for the content, accuracy, or availability of external 
              sites. Links are provided for convenience only and do not constitute endorsement of the 
              external content.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Account Termination
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              The institution reserves the right to suspend or terminate user accounts for violations of 
              these terms and conditions, inappropriate use of the system, or any activity that may 
              compromise system security or integrity.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Modifications to Terms
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              These terms and conditions may be updated from time to time to reflect changes in our 
              services, legal requirements, or institutional policies. Users will be notified of 
              significant changes through official communication channels. Continued use of the system 
              after modifications constitutes acceptance of the updated terms.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Governing Law and Jurisdiction
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              These terms and conditions shall be governed by and construed in accordance with applicable 
              educational laws and regulations. Any disputes arising under these terms shall be subject 
              to the jurisdiction of appropriate educational authorities and courts.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Dispute Resolution and Payment Issues
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              In case of payment disputes, transaction failures, or refund requests:
            </p>

            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
              <li>Contact The Scholars' Home administration within 48 hours of the issue</li>
              <li>Provide transaction details, payment receipts, and relevant documentation</li>
              <li>Allow 5-7 business days for investigation and resolution</li>
              <li>Escalate unresolved issues to the payment gateway support if necessary</li>
              <li>Legal disputes will be subject to jurisdiction of local courts</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Contact Information
            </h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              If you have questions about these terms and conditions, payment issues, or need clarification 
              on any aspect of system usage, please contact The Scholars' Home administration through the 
              official support channels provided within the system or visit our main office during business hours.
            </p>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              For payment-related queries, refund requests, or technical issues with the payment gateway, 
              please include your transaction ID, payment date, and amount in your communication for faster resolution.
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-8 pt-4 border-t border-gray-200 dark:border-gray-600">
              Last updated: January 2025
            </p>

          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <a 
              href="/privacy-policy" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              ← Privacy Policy
            </a>
            <a 
              href="/sign-in" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Back to Sign In →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}